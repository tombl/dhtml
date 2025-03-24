import type { Displayable, Renderable } from 'dhtml'
import { assert, is_html, is_iterable, is_renderable, single_part_template, type ToString } from '../shared.ts'
import { delete_controller, get_controller, get_key } from './controller.ts'
import { create_root, create_root_after, type Root } from './root.ts'
import { create_span, delete_contents, extract_contents, insert_node, type Span } from './span.ts'
import type { Cleanup } from './util.ts'

export type Part = (value: unknown) => void

export function create_child_part(parent_node: Node | Span, parent_span: Span, child_index: number): Part {
	let span: Span

	// for when we're rendering a renderable:
	let current_renderable: Renderable | null = null

	// for when we're rendering a template:
	let root: Root | undefined

	// for when we're rendering multiple values:
	let roots: Root[] | undefined

	// for when we're rendering a string/single dom node:
	// undefined means no previous value, because a user-specified undefined is remapped to null
	let old_value: unknown

	function switch_renderable(next: Renderable | null) {
		if (current_renderable && current_renderable !== next) {
			const controller = get_controller(current_renderable)
			controller._unmount_callbacks.forEach(callback => callback?.())
			delete_controller(current_renderable)
		}
		current_renderable = next
	}

	function disconnect_root() {
		// root.detach and part.detach are mutually recursive, so this detaches children too.
		root?.detach()
		root = undefined
	}

	if (parent_node instanceof Node) {
		const child = parent_node.childNodes[child_index]
		span = create_span(child)
	} else {
		let child = parent_node._start
		for (let i = 0; i < child_index; i++) {
			{
				assert(child.nextSibling !== null, 'expected more siblings')
				assert(child.nextSibling !== parent_node._end, 'ran out of siblings before the end')
			}
			child = child.nextSibling
		}
		span = create_span(child)
	}

	function render_renderable(renderable: Renderable): Displayable {
		const controller = get_controller(renderable)

		controller._invalidate ??= () => {
			assert(current_renderable === renderable, 'could not invalidate an outdated renderable')
			update(renderable)
		}
		controller._parent_node = span._parent

		try {
			return renderable.render()
		} catch (thrown) {
			if (is_html(thrown)) {
				return thrown
			} else {
				throw thrown
			}
		}
	}

	function handle_iterable(values: Iterable<Displayable>) {
		if (!roots) {
			// we previously rendered a single value, so we need to clear it.
			disconnect_root()
			delete_contents(span)

			roots = []
		}

		// create or update a root for every item.
		let i = 0
		let end = span._start
		for (const item of values) {
			const key = get_key(item)
			let root = (roots[i] ??= create_root_after(end))

			if (key !== undefined && root._key !== key) {
				const j = roots.findIndex(r => r._key === key)
				root._key = key
				if (j !== -1) {
					const root1 = root
					const root2 = roots[j]

					// swap the contents of the spans
					const tmp_content = extract_contents(root1._span)
					insert_node(root1._span, extract_contents(root2._span))
					insert_node(root2._span, tmp_content)

					// swap the spans back
					const tmp_span = root1._span
					root1._span = root2._span
					root2._span = tmp_span

					// swap the roots
					roots[j] = root1
					root = roots[i] = root2
				}
			}

			root.render(item)
			end = root._span._end
			i++
		}

		// and now remove excess roots if the iterable has shrunk.
		while (roots.length > i) {
			const root = roots.pop()
			assert(root)
			root.detach()
			delete_contents(root._span)
		}

		span._end = end
	}

	function handle_single_value(value: Node | ToString | null) {
		if (old_value != null && value !== null && !(old_value instanceof Node) && !(value instanceof Node)) {
			// we previously rendered a string, and we're rendering a string again.
			assert(span._start === span._end && span._start instanceof Text)
			span._start.data = '' + value
		} else {
			delete_contents(span)
			if (value !== null) insert_node(span, value instanceof Node ? value : new Text(value satisfies ToString as string))
		}
	}

	function update(value_: unknown) {
		let value = value_ as Displayable

		assert(span)
		const ends_were_equal = span._parent === parent_span._parent && span._end === parent_span._end

		if (is_renderable(value)) {
			switch_renderable(value)

			value = render_renderable(value)

			// if render returned another renderable, we want to track/cache both renderables individually.
			// wrap it in a nested ChildPart so that each can be tracked without ChildPart having to handle multiple renderables.
			if (is_renderable(value)) value = single_part_template(value)
		} else {
			switch_renderable(null)
		}

		// if it's undefined, swap the value for null.
		// this means if the initial value is undefined,
		// it won't conflict with old_value's default of undefined,
		// so it'll still render.
		if (value === undefined) value = null

		// NOTE: we're explicitly not caching/diffing the value when it's an iterable,
		// given it can yield different values but have the same identity. (e.g. arrays)
		if (is_iterable(value)) {
			handle_iterable(value as Iterable<Displayable>)
		} else {
			if (roots) {
				for (const root of roots) root.detach()
				roots = undefined
			}

			// only continue if the value hasn't changed.
			if (!Object.is(old_value, value)) {
				if (is_html(value)) {
					root ??= create_root(span)
					root.render(value) // root.render will detach the previous tree if the template has changed.
				} else {
					// if we previously rendered a tree that might contain renderables,
					// and the template has changed (or we're not even rendering a template anymore),
					// we need to clear the old renderables.
					disconnect_root()

					handle_single_value(value)
				}

				old_value = value
			}
		}

		if (current_renderable) {
			const controller = get_controller(current_renderable)
			controller._mount_callbacks?.forEach(callback => controller._unmount_callbacks.add(callback?.()))
			delete controller._mount_callbacks
		}

		if (ends_were_equal) parent_span._end = span._end
	}

	return update
}

export function create_property_part(node: Node, name: string): Part {
	return value => {
		// @ts-expect-error
		node[name] = value
	}
}

export function create_attribute_part(node: Element, name: string): Part {
	return value => {
		if (value === null) {
			node.removeAttribute(name)
		} else {
			// setAttribute implicitly casts the value to a string
			node.setAttribute(name, value as string)
		}
	}
}

export type Directive = (node: Element) => Cleanup

export function create_directive_part(node: Node): Part {
	let cleanup: Cleanup
	return fn => {
		assert(typeof fn === 'function' || fn == null)
		cleanup?.()
		cleanup = fn?.(node)
	}
}

export function attr_directive(name: string, value: string | boolean | null | undefined): Directive {
	return node => {
		if (typeof value === 'boolean') node.toggleAttribute(name, value)
		else if (value == null) node.removeAttribute(name)
		else node.setAttribute(name, value)
		return () => {
			node.removeAttribute(name)
		}
	}
}
