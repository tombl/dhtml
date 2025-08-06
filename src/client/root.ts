import {
	assert,
	is_html,
	is_iterable,
	is_keyed,
	is_renderable,
	single_part_template,
	unwrap_html,
	type Displayable,
	type Key,
	type Renderable,
} from '../shared.ts'
import {
	compile_template,
	DYNAMIC_WHOLE,
	PART_ATTRIBUTE,
	PART_CHILD,
	PART_DIRECTIVE,
	PART_PROPERTY,
	type CompiledTemplate,
} from './compiler.ts'
import {
	create_attribute_part,
	create_child_part,
	create_directive_part,
	create_property_part,
	type Part,
} from './parts.ts'
import { create_span_into, type Span } from './span.ts'
import { is_comment, is_element } from './util.ts'

export interface Root {
	render(value: Displayable): void
}

export function createRoot(parent: Node): Root {
	const span = create_span_into(parent)
	return { render: create_child_part(span) }
}

function find_end(start: Comment): Comment | null {
	assert(start.data === '?[')
	let depth = 1
	let node: ChildNode | null = start
	while ((node = node.nextSibling)) {
		if (is_comment(node)) {
			if (node.data === '?[') depth++
			else if (node.data === '?]') {
				depth--
				if (depth === 0) return node
			}
		}
	}
	return null
}

export function hydrate(parent: Node, value: Displayable): Root {
	let start
	for (start of parent.childNodes) {
		if (is_comment(start) && start.data === '?[') break
	}
	assert(
		start && is_comment(start),
		`Could not find hydration start comment. Please ensure the element contains server-side rendered output.`,
	)

	const end = find_end(start)
	assert(end, `Could not find hydration end comment. Please ensure the element contains server-side rendered output.`)

	const render = hydrate_child_part({ _start: start, _end: end }, value)
	render(value)
	return { render }
}

function hydrate_child_part(span: Span, value: unknown) {
	let current_renderable: Renderable | undefined
	let template: CompiledTemplate | undefined
	let template_parts: [number, Part][] | undefined
	let entries: Array<{ _span: Span; _part: Part; _key: Key }> | undefined

	if (is_renderable(value)) {
		try {
			value = (current_renderable = value).render()
		} catch (thrown) {
			if (is_html(thrown)) {
				value = thrown
			} else {
				throw thrown
			}
		}

		if (is_renderable(value)) value = single_part_template(value)
	}

	if (is_iterable(value)) {
		entries = []
		let end = span._start

		for (const item of value) {
			const key = is_keyed(item) ? item._key : (item as Key)

			const start = end.nextSibling
			assert(start && is_comment(start) && start.data === '?[')

			end = find_end(start)!
			assert(end)

			const span = { _start: start, _end: end }
			entries.push({ _span: span, _part: hydrate_child_part(span, item), _key: key })
		}
		assert(end.nextSibling === span._end)
	}

	if (is_html(value)) {
		const { _statics: statics, _dynamics: dynamics } = unwrap_html(value)
		template = compile_template(statics)

		const node_by_part: Array<Node | Span> = []

		const walker = document.createTreeWalker(span._start.parentNode!, 129)
		const template_walker = document.createTreeWalker(template._content, 129)
		assert((NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT) === 129)
		walker.currentNode = span._start

		while (walker.nextNode() && template_walker.nextNode()) {
			const node = walker.currentNode
			const template_node = template_walker.currentNode
			if (node === span._end) break

			if (is_comment(node) && is_comment(template_node)) {
				if (node.data === '?[') {
					assert(DYNAMIC_WHOLE.test(template_node.data))
					const end = find_end(node)
					assert(end)
					walker.currentNode = end
				}
				continue
			}

			assert(is_element(node))
			assert(
				node.nodeType === template_node.nodeType,
				`Node type mismatch: ${node.nodeType} != ${template_node.nodeType}`,
			)
			assert(template_node instanceof HTMLElement || template_node instanceof SVGElement)
			assert(node.tagName === template_node.tagName, `Tag name mismatch: ${node.tagName} !== ${template_node.tagName}`)

			if (template_node.dataset.dynparts)
				for (const part of template_node.dataset.dynparts.split(' ')) node_by_part[+part] = node
		}

		for (const part of template._root_parts) node_by_part[part] = span

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

					assert(child.parentNode)
					assert(child.previousSibling && is_comment(child.previousSibling) && child.previousSibling.data === '?[')
					const end = find_end(child.previousSibling)
					assert(end)

					return [
						dynamic_index,
						hydrate_child_part(
							{
								_start: child.previousSibling,
								_end: end,
							},
							dynamics[dynamic_index],
						),
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

	return create_child_part(span, true, current_renderable, template, template_parts, entries, value)
}
