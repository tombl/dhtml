import { controllers, keys, mount_callbacks } from './controller.ts'
import { is_html, single_part_template } from './html.ts'
import { assert } from './internal.ts'
import { create_root, create_root_after, type Root } from './root.ts'
import { create_span, span_delete_contents, span_extract_contents, span_insert_node, type Span } from './span.ts'
import { is_iterable, is_renderable, type Cleanup, type Displayable, type Renderable } from './util.ts'

export interface Part {
	update(value: unknown): void
	detach(): void
}

export function create_child_part(parent_node: Node | Span, parentSpan: Span, childIndex: number): Part {
	let span: Span

	// for when we're rendering a renderable:
	let renderable: Renderable | null = null

	// for when we're rendering a template:
	let root: Root | undefined

	// for when we're rendering multiple values:
	let roots: Root[] | undefined

	// for when we're rendering a string/single dom node:
	// undefined means no previous value, because a user-specified undefined is remapped to null

	let old_value: Displayable | null | undefined

	function switch_renderable(next: Renderable | null) {
		if (renderable && renderable !== next) {
			const controller = controllers.get(renderable)
			if (controller?._unmount_callbacks) for (const callback of controller._unmount_callbacks) callback?.()
			controllers.delete(renderable)
		}
		renderable = next
	}

	function disconnect_root() {
		// root.detach and part.detach are mutually recursive, so this detaches children too.
		root?.detach()
		root = undefined
	}

	if (parent_node instanceof Node) {
		const child = parent_node.childNodes[childIndex]
		span = create_span(child)
	} else {
		let child = parent_node._start
		for (let i = 0; i < childIndex; i++) {
			{
				assert(child.nextSibling !== null, 'expected more siblings')
				assert(child.nextSibling !== parent_node._end, 'ran out of siblings before the end')
			}
			child = child.nextSibling
		}
		span = create_span(child)
	}

	return {
		update: function update(value: Displayable) {
			assert(span)
			const endsWereEqual = span._parent === parentSpan._parent && span._end === parentSpan._end

			if (is_renderable(value)) {
				switch_renderable(value)

				const renderable = value

				if (!controllers.has(renderable))
					controllers.set(renderable, {
						_mounted: false,
						_invalidate_queued: null,
						_invalidate: () => {
							assert(renderable === renderable, 'could not invalidate an outdated renderable')
							update(renderable)
						},
						_unmount_callbacks: null, // will be upgraded to a Set if needed.
						_parent_node: span._parent,
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
			// it won't conflict with prevValue's default of undefined,
			// so it'll still render.
			if (value === undefined) value = null

			// NOTE: we're explicitly not caching/diffing the value when it's an iterable,
			// given it can yield different values but have the same identity. (e.g. arrays)
			if (is_iterable(value)) {
				if (!roots) {
					// we previously rendered a single value, so we need to clear it.
					disconnect_root()
					span_delete_contents(span)

					roots = []
				}

				// create or update a root for every item.
				let i = 0
				let end = span._start
				for (const item of value) {
					// @ts-expect-error -- WeakMap lookups of non-objects always return undefined, which is fine
					const key = keys.get(item) ?? item
					let root = (roots[i] ??= create_root_after(end))

					if (key !== undefined && root._key !== key) {
						const j = roots.findIndex(r => r._key === key)
						root._key = key
						if (j !== -1) {
							const root1 = root
							const root2 = roots[j]

							// swap the contents of the spans
							const tmp_content = span_extract_contents(root1._span)
							span_insert_node(root1._span, span_extract_contents(root2._span))
							span_insert_node(root2._span, tmp_content)

							// swap the spans back
							const tmp_span = root1._span
							root1._span = root2._span
							root2._span = tmp_span

							// swap the roots
							roots[j] = root1
							root = roots[i] = root2
						}
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
					span_delete_contents(root._span)
				}

				span._end = end

				// @ts-expect-error -- a null controllable will always return a null controller
				const controller = controllers.get(renderable)
				if (controller) {
					controller._mounted = true
					// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
					for (const callback of mount_callbacks.get(renderable) ?? []) {
						;(controller._unmount_callbacks ??= new Set()).add(callback())
					}
					// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
					mount_callbacks.delete(renderable)
				}

				if (endsWereEqual) parentSpan._end = span._end

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
					span_delete_contents(span)
					if (value !== null) span_insert_node(span, value instanceof Node ? value : new Text('' + value))
				}
			}

			old_value = value

			// @ts-expect-error -- a null controllable will always return a null controller
			const controller = controllers.get(renderable)
			if (controller) {
				controller._mounted = true
				// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
				for (const callback of mount_callbacks.get(renderable) ?? []) {
					;(controller._unmount_callbacks ??= new Set()).add(callback())
				}
				// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
				mount_callbacks.delete(renderable)
			}

			if (endsWereEqual) parentSpan._end = span._end
		},
		detach: () => {
			switch_renderable(null)
			disconnect_root()
		},
	}
}

export function createPropertyPart(node: Node, name: string): Part {
	return {
		update: value => {
			// @ts-expect-error
			node[name] = value
		},
		detach: () => {
			// @ts-expect-error
			delete node[name]
		},
	}
}

export function create_attribute_part(node: Element, name: string): Part {
	return {
		// @ts-expect-error -- setAttribute implicitly casts the value to a string
		update: value => node.setAttribute(name, value),
		detach: () => node.removeAttribute(name),
	}
}

export type Directive = (node: Element) => Cleanup

export function create_directive_part(node: Node): Part {
	let cleanup: Cleanup
	return {
		update: fn => {
			assert(typeof fn === 'function' || fn == null)
			cleanup?.()
			cleanup = fn?.(node)
		},

		detach: () => {
			cleanup?.()
			cleanup = null
		},
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
