import {
	assert,
	is_html,
	is_iterable,
	is_keyed,
	is_renderable,
	single_part_template,
	unwrap_renderable,
	type Displayable,
	type Key,
	type Renderable,
} from '../shared.ts'
import {
	compile_template,
	PART_ATTRIBUTE,
	PART_CHILD,
	PART_DIRECTIVE,
	PART_PROPERTY,
	type CompiledTemplate,
} from './compiler.ts'
import { controllers, get_controller } from './controller.ts'
import { create_span_after, delete_contents, extract_contents, insert_node, type Span } from './span.ts'
import type { Cleanup } from './util.ts'

export type Part = (value: unknown) => void

export function create_child_part(
	span: Span,

	// for when we're rendering a renderable:
	needs_revalidate = true,
	current_renderable?: Renderable,

	// for when we're rendering a template:
	old_template?: CompiledTemplate,
	template_parts?: [number, Part][],

	// for when we're rendering multiple values:
	entries?: Array<{ _span: Span; _part: Part; _key: Key }>,

	// for when we're rendering a string/single dom node:
	// undefined means no previous value, because a user-specified undefined is remapped to null
	old_value?: unknown,
): Part {
	function switch_renderable(next: Renderable | undefined) {
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
		if (template_parts !== undefined) {
			for (const [, part] of template_parts) part(null)
			old_template = undefined
			template_parts = undefined
		}
	}

	return function update(value) {
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

			value = unwrap_renderable(renderable)

			// if render returned another renderable, we want to track/cache both renderables individually.
			// wrap it in a nested ChildPart so that each can be tracked without ChildPart having to handle multiple renderables.
			if (is_renderable(value)) value = single_part_template(value)
		} else switch_renderable(undefined)

		// if it's undefined, swap the value for null.
		// this means if the initial value is undefined,
		// it won't conflict with old_value's default of undefined,
		// so it'll still render.
		if (value === undefined) value = null

		// NOTE: we're explicitly not caching/diffing the value when it's an iterable,
		// given it can yield different values but have the same identity. (e.g. arrays)
		if (is_iterable(value)) {
			if (!entries) {
				// we previously rendered a single value, so we need to clear it.
				disconnect_root()
				delete_contents(span)
				entries = []
			}

			// create or update a root for every item.
			let i = 0
			let end = span._start
			for (const item of value) {
				const key = is_keyed(item) ? item._key : (item as Key)
				if (entries.length <= i) {
					const span = create_span_after(end)
					entries[i] = { _span: span, _part: create_child_part(span), _key: key }
				}

				if (key !== undefined && entries[i]._key !== key) {
					for (let j = i + 1; j < entries.length; j++) {
						const entry1 = entries[i]
						const entry2 = entries[j]

						if (entry2._key === key) {
							// swap the contents of the spans
							const tmp_content = extract_contents(entry1._span)
							insert_node(entry1._span, extract_contents(entry2._span))
							insert_node(entry2._span, tmp_content)

							// swap the spans back
							const tmp_span = { ...entry1._span }
							Object.assign(entry1._span, entry2._span)
							Object.assign(entry2._span, tmp_span)

							// swap the roots
							entries[j] = entry1
							entries[i] = entry2

							break
						}
					}

					entries[i]._key = key
				}

				entries[i]._part(item as Displayable)
				end = entries[i]._span._end
				i++
			}

			// and now remove excess parts if the iterable has shrunk.
			while (entries.length > i) {
				const entry = entries.pop()
				assert(entry)
				entry._part(null)
			}

			old_value = undefined
			return
		} else if (entries) {
			for (const entry of entries) entry._part(null)
			entries = undefined
		}

		if (is_html(value)) {
			const { _dynamics: dynamics, _statics: statics } = value
			const template = compile_template(statics)

			assert(
				template._parts.length === dynamics.length,
				'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
			)

			if (old_template !== template) {
				if (template_parts !== undefined) {
					// scan through all the parts of the previous tree, and clear any renderables.
					for (const [_idx, part] of template_parts) part(null)
					template_parts = undefined
				}

				old_template = template

				const doc = old_template._content.cloneNode(true) as DocumentFragment

				const node_by_part: Array<Node | Span> = []

				for (const node of doc.querySelectorAll('[data-dynparts]')) {
					const parts = node.getAttribute('data-dynparts')
					assert(parts)
					node.removeAttribute('data-dynparts')
					for (const part of parts.split(' ')) node_by_part[+part] = node
				}

				for (const part of old_template._root_parts) node_by_part[part] = span

				// the fragment must be inserted before the parts are constructed,
				// because they need to know their final location.
				// this also ensures that custom elements are upgraded before we do things
				// to them, like setting properties or attributes.
				delete_contents(span)
				insert_node(span, doc)

				template_parts = template._parts.map(([dynamic_index, [type, data]], element_index): [number, Part] => {
					const node = node_by_part[element_index]
					switch (type) {
						case PART_CHILD:
							let child: ChildNode | null

							if (node instanceof Node) {
								child = node.childNodes[data]
								assert(child)
							} else {
								child = node._start.nextSibling
								assert(child)
								for (let i = 0; i < data; i++) {
									child = child.nextSibling
									assert(child !== null, 'expected more siblings')
									assert(child !== node._end, 'ran out of siblings before the end')
								}
							}

							assert(child.parentNode && child.previousSibling && child.nextSibling)

							return [
								dynamic_index,
								create_child_part({
									_start: child.previousSibling,
									_end: child.nextSibling,
								}),
							]
						case PART_DIRECTIVE:
							assert(node instanceof Node)
							return [dynamic_index, create_directive_part(node)]
						case PART_ATTRIBUTE:
							assert(node instanceof Element)
							return [dynamic_index, create_attribute_part(node, data)]
						case PART_PROPERTY:
							assert(node instanceof Node)
							return [dynamic_index, create_property_part(node, data)]
					}
				})
			}

			assert(template_parts)
			for (const [idx, part] of template_parts) part(dynamics[idx])

			old_value = undefined
			return
		}

		if (!Object.is(old_value, value)) {
			// if we previously rendered a tree that might contain renderables,
			// and the template has changed (or we're not even rendering a template anymore),
			// we need to clear the old renderables.
			disconnect_root()

			if (old_value != null && value !== null && !(old_value instanceof Node) && !(value instanceof Node)) {
				// we previously rendered a string, and we're rendering a string again.
				assert(span._start.nextSibling?.nextSibling === span._end && span._start.nextSibling instanceof Text)
				span._start.nextSibling.data = '' + value
			} else {
				delete_contents(span)
				if (value !== null) insert_node(span, value instanceof Node ? value : new Text('' + value))
			}

			old_value = value
		}
	}
}

export function create_property_part(node: Node, name: string): Part {
	return value => {
		// @ts-expect-error
		node[name] = value
	}
}

export function create_attribute_part(node: Element, name: string): Part {
	return value => set_attr(node, name, value)
}

export type Directive = (el: Element) => Cleanup

export function create_directive_part(node: Node): Part {
	let cleanup: Cleanup
	return fn => {
		assert(typeof fn === 'function' || fn == null)
		cleanup?.()
		cleanup = fn?.(node)
	}
}

function set_attr(el: Element, name: string, value: unknown) {
	if (typeof value === 'boolean') el.toggleAttribute(name, value)
	else if (value == null) el.removeAttribute(name)
	// the cast is fine because setAttribute implicitly casts the value to a string
	else el.setAttribute(name, value as string)
}

export function attr_directive(name: string, value: string | boolean | null | undefined): Directive {
	return el => {
		set_attr(el, name, value)
		return () => set_attr(el, name, null)
	}
}

export function on_directive(
	type: string,
	listener: EventListenerOrEventListenerObject,
	options?: boolean | AddEventListenerOptions,
): Directive {
	return el => {
		el.addEventListener(type, listener, options)
		return () => el.removeEventListener(type, listener, options)
	}
}
