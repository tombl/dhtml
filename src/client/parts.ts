import {
	assert,
	is_html,
	is_iterable,
	is_renderable,
	single_part_template,
	type Displayable,
	type Renderable,
} from '../shared.ts'
import { controllers, get_controller, get_key } from './controller.ts'
import { create_root, create_root_after, type Root } from './root.ts'
import { create_span, delete_contents, extract_contents, insert_node, type Span } from './span.ts'
import type { Cleanup } from './util.ts'

export type Part = (value: unknown) => void

export function create_child_part(parent_node: Node | Span, parent_span: Span, child_index: number): Part {
	let span: Span

	// for when we're rendering a renderable:
	let current_renderable: Renderable | null = null
	let needs_revalidate = true

	// for when we're rendering a template:
	let root: Root | undefined

	// for when we're rendering multiple values:
	let roots: Root[] | undefined

	// for when we're rendering a string/single dom node:
	// undefined means no previous value, because a user-specified undefined is remapped to null
	let old_value: unknown

	function switch_renderable(next: Renderable | null) {
		if (current_renderable && current_renderable !== next) {
			const controller = controllers.get(current_renderable)
			if (controller) {
				controller._invalidate.delete(switch_renderable)

				// If this was the last instance, call unmount callbacks
				if (!controller._invalidate.size) {
					controller._unmount_callbacks.forEach(callback => callback?.())
					controller._unmount_callbacks.length = 0
				}
			}
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
			assert(child.nextSibling !== null, 'expected more siblings')
			assert(child.nextSibling !== parent_node._end, 'ran out of siblings before the end')
			child = child.nextSibling
		}
		span = create_span(child)
	}

	return function update(value) {
		assert(span)
		const starts_were_equal = span._parent === parent_span._parent && span._start === parent_span._start
		const ends_were_equal = span._parent === parent_span._parent && span._end === parent_span._end

		if (is_renderable(value)) {
			if (!needs_revalidate && value === current_renderable) return
			needs_revalidate = false

			switch_renderable(value)

			const renderable = value
			const controller = get_controller(renderable)
			// If this is the first mounted instance, call mount callbacks
			if (!controller._invalidate.size) {
				controller._unmount_callbacks = controller._mount_callbacks.map(callback => callback())
			}
			controller._invalidate.set(switch_renderable, () => {
				assert(renderable === current_renderable)
				needs_revalidate = true
				update(renderable)
			})

			try {
				value = renderable.render()
			} catch (thrown) {
				if (is_html(thrown)) {
					value = thrown
				} else {
					throw thrown
				}
			}

			// if render returned another renderable, we want to track/cache both renderables individually.
			// wrap it in a nested ChildPart so that each can be tracked without ChildPart having to handle multiple renderables.
			if (is_renderable(value)) value = single_part_template(value)
		} else switch_renderable(null)

		// if it's undefined, swap the value for null.
		// this means if the initial value is undefined,
		// it won't conflict with old_value's default of undefined,
		// so it'll still render.
		if (value === undefined) value = null

		// NOTE: we're explicitly not caching/diffing the value when it's an iterable,
		// given it can yield different values but have the same identity. (e.g. arrays)
		if (is_iterable(value)) {
			if (!roots) {
				// we previously rendered a single value, so we need to clear it.
				disconnect_root()
				delete_contents(span)

				roots = []
			}

			// create or update a root for every item.
			let i = 0
			let end = span._start
			for (const item of value) {
				const key = get_key(item)
				let root = (roots[i] ??= create_root_after(end))

				if (key !== undefined && root._key !== key) {
					for (let j = i; j < roots.length; j++) {
						const root1 = root
						const root2 = roots[j]

						if (root2._key === key) {
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

							break
						}
					}

					root._key = key
				}

				root.render(item as Displayable)
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

			if (starts_were_equal) parent_span._start = span._start
			if (ends_were_equal) parent_span._end = span._end

			return
		} else if (roots) {
			for (const root of roots) root.detach()
			roots = undefined
		}

		// now early return if the value hasn't changed.
		if (Object.is(old_value, value)) return

		if (is_html(value)) {
			root ??= create_root(span)
			root.render(value) // root.render will detach the previous tree if the template has changed.
		} else {
			// if we previously rendered a tree that might contain renderables,
			// and the template has changed (or we're not even rendering a template anymore),
			// we need to clear the old renderables.
			disconnect_root()

			if (old_value != null && value !== null && !(old_value instanceof Node) && !(value instanceof Node)) {
				// we previously rendered a string, and we're rendering a string again.
				assert(span._start === span._end && span._start instanceof Text)
				span._start.data = '' + value
			} else {
				delete_contents(span)
				if (value !== null) insert_node(span, value instanceof Node ? value : new Text('' + value))
			}
		}

		old_value = value

		if (starts_were_equal) parent_span._start = span._start
		if (ends_were_equal) parent_span._end = span._end
	}
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
