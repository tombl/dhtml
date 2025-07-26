import { assert, is_html, is_renderable, type Displayable, type Renderable } from '../shared.ts'
import {
	compile_template,
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

export function hydrate(parent: Node, value: Displayable): Root {
	let children = [...parent.childNodes]
	let start, end

	for (let i = 0; i < children.length; i++) {
		const node = children[i]
		if (is_comment(node) && node.data === '?') {
			start = node
			break
		}
	}
	for (let i = 0; i < children.length; i++) {
		const node = children[children.length - i - 1]
		if (is_comment(node) && node.data === '?') {
			end = node
			break
		}
	}

	assert(start && end && start !== end)
	const render = hydrate_child_part({ _parent: parent, _start: start, _end: end }, value)
	render(value)
	return { render }
}

function hydrate_child_part(span: Span, value: unknown) {
	let current_renderable: Renderable | undefined
	let template: CompiledTemplate | undefined
	let template_parts: [number, Part][] | undefined

	if (is_renderable(value)) {
		value = (current_renderable = value).render()
	}

	if (is_html(value)) {
		template = compile_template(value._statics)

		const node_by_part: Array<Node | Span> = []

		const walker = document.createTreeWalker(span._parent, 1)
		const template_walker = document.createTreeWalker(template._content, 1)
		assert(NodeFilter.SHOW_ELEMENT === 1)
		walker.currentNode = span._start

		while (walker.nextNode() && template_walker.nextNode()) {
			const node = walker.currentNode
			const template_node = template_walker.currentNode
			if (node === span._end) break

			assert(is_element(node))
			if (node.nodeType !== template_node.nodeType) {
				throw new Error(`Node type mismatch: ${node.nodeType} !== ${template_node.nodeType}`)
			}
			assert(template_node instanceof HTMLElement || template_node instanceof SVGElement)

			if (template_node.dataset.dynparts)
				for (const part of template_node.dataset.dynparts.split(' ')) node_by_part[+part] = node
		}

		for (const part of template._root_parts) node_by_part[part] = span

		template_parts = template._parts.map(([dynamic_index, data], element_index): [number, Part] => {
			const node = node_by_part[element_index]
			switch (data._type) {
				case PART_CHILD:
					let child: ChildNode | null

					if (node instanceof Node) {
						child = node.childNodes[data._index]
						assert(child)
					} else {
						child = node._start.nextSibling
						assert(child)
						for (let i = 0; i < data._index; i++) {
							child = child.nextSibling
							assert(child !== null, 'expected more siblings')
							assert(child !== node._end, 'ran out of siblings before the end')
						}
					}

					assert(child.parentNode && child.previousSibling && child.nextSibling)

					return [
						dynamic_index,
						hydrate_child_part(
							{
								_parent: child.parentNode,
								_start: child.previousSibling,
								_end: child.nextSibling,
							},
							value._dynamics[dynamic_index],
						),
					]
				case PART_DIRECTIVE:
					assert(node instanceof Node)
					return [dynamic_index, create_directive_part(node)]
				case PART_ATTRIBUTE:
					assert(node instanceof Element)
					return [dynamic_index, create_attribute_part(node, data._name)]
				case PART_PROPERTY:
					assert(node instanceof Node)
					return [dynamic_index, create_property_part(node, data._name)]
				default:
					return data satisfies never
			}
		})
	}

	return create_child_part(span, true, current_renderable, template, template_parts)
}
