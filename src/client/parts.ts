import type { Displayable, Renderable } from 'dhtml'
import { assert, is_html, is_iterable, is_renderable, single_part_template } from '../shared.ts'
import { delete_controller, get_controller, get_key } from './controller.ts'
import { create_root, create_root_after, type Root } from './root.ts'
import { create_span, delete_contents, extract_contents, insert_node, type Span } from './span.ts'
import type { Cleanup } from './util.ts'

export type Part = (node: Node | Span, value: unknown, span: Span) => void

interface ChildPart {
	_span: Span

	// for when we're rendering a renderable:
	_renderable: Renderable | null

	// for when we're rendering a template:
	_root: Root | undefined

	// for when we're rendering multiple values:
	_roots: Root[] | undefined

	// for when we're rendering a string/single dom node:
	// undefined means no previous value, because a user-specified undefined is remapped to null
	_value: unknown
}

export function create_child_part(child_index: number): Part {
	const instances = new WeakMap<Node | Span, ChildPart>()
	return function the_part(parent_node, value, parent_span) {
		let part = instances.get(parent_node)!
		if (!part) {
			instances.set(
				parent_node,
				(part = {
					_renderable: null,
				} as ChildPart),
			)
		}

		if (!part._span) {
			if (parent_node instanceof Node) {
				const child = parent_node.childNodes[child_index]
				part._span = create_span(child)
			} else {
				let child = parent_node._start
				for (let i = 0; i < child_index; i++) {
					const sibling = child.nextSibling
					assert(sibling !== null, 'expected more siblings')
					assert(sibling !== parent_node._end, 'ran out of siblings before the end')
					child = sibling
				}
				part._span = create_span(child)
			}
		}

		function switch_renderable(next: Renderable | null) {
			if (part._renderable && part._renderable !== next) {
				const controller = get_controller(part._renderable)
				controller._unmount_callbacks.forEach(callback => callback?.())
				delete_controller(part._renderable)
			}
			part._renderable = next
		}

		function disconnect_root() {
			// root.detach and part.detach are mutually recursive, so this detaches children too.
			part._root?.detach()
			part._root = undefined
		}

		function render_renderable(renderable: Renderable): Displayable {
			const controller = get_controller(renderable)

			controller._invalidate ??= () => {
				assert(part._renderable === renderable, 'could not invalidate an outdated renderable')
				the_part(parent_node, renderable, parent_span)
			}
			controller._parent_node = part._span._parent

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
			if (!part._roots) {
				// we previously rendered a single value, so we need to clear it.
				disconnect_root()
				delete_contents(part._span)

				part._roots = []
			}

			// create or update a root for every item.
			let i = 0
			let end = part._span._start
			for (const item of values) {
				const key = get_key(item)
				let root = (part._roots[i] ??= create_root_after(end))

				if (key !== undefined && root._key !== key) {
					const j = part._roots.findIndex(r => r._key === key)
					root._key = key
					if (j !== -1) {
						const root1 = root
						const root2 = part._roots[j]

						// swap the contents of the spans
						const tmp_content = extract_contents(root1._span)
						insert_node(root1._span, extract_contents(root2._span))
						insert_node(root2._span, tmp_content)

						// swap the spans back
						const tmp_span = root1._span
						root1._span = root2._span
						root2._span = tmp_span

						// swap the roots
						part._roots[j] = root1
						root = part._roots[i] = root2
					}
				}

				root.render(item)
				end = root._span._end
				i++
			}

			// and now remove excess roots if the iterable has shrunk.
			while (part._roots.length > i) {
				const root = part._roots.pop()
				assert(root)
				root.detach()
				delete_contents(root._span)
			}

			part._span._end = end
		}

		function handle_single_value(value: unknown) {
			if (part._value != null && value !== null && !(part._value instanceof Node) && !(value instanceof Node)) {
				// we previously rendered a string, and we're rendering a string again.
				assert(part._span._start === part._span._end && part._span._start instanceof Text)
				part._span._start.data = '' + value
			} else {
				delete_contents(part._span)
				if (value !== null) insert_node(part._span, value instanceof Node ? value : document.createTextNode('' + value))
			}
		}

		const ends_were_equal = part._span._parent === parent_span._parent && part._span._end === parent_span._end

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
			if (part._roots) {
				for (const root of part._roots) root.detach()
				part._roots = undefined
			}

			// only continue if the value hasn't changed.
			if (!Object.is(part._value, value)) {
				if (is_html(value)) {
					part._root ??= create_root(part._span)
					part._root.render(value) // root.render will detach the previous tree if the template has changed.
				} else {
					// if we previously rendered a tree that might contain renderables,
					// and the template has changed (or we're not even rendering a template anymore),
					// we need to clear the old renderables.
					disconnect_root()

					handle_single_value(value)
				}

				part._value = value
			}
		}

		if (part._renderable) {
			const controller = get_controller(part._renderable)
			controller._mount_callbacks?.forEach(callback => controller._unmount_callbacks.add(callback?.()))
			delete controller._mount_callbacks
		}

		if (ends_were_equal) parent_span._end = part._span._end
	}
}

export function create_property_part(name: string): Part {
	return (node, value) => {
		// @ts-expect-error
		node[name] = value
	}
}

export function create_attribute_part(name: string): Part {
	return (node, value) => {
		assert(node instanceof Element)
		if (value === null) {
			node.removeAttribute(name)
		} else {
			// setAttribute implicitly casts the value to a string
			node.setAttribute(name, value as string)
		}
	}
}

export type Directive = (node: Element) => Cleanup

export function create_directive_part(): Part {
	const cleanups = new WeakMap<Node, Cleanup>()
	return (node, fn) => {
		assert(node instanceof Node)
		assert(typeof fn === 'function' || fn == null)

		cleanups.get(node)?.()
		cleanups.set(node, fn?.(node))
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
