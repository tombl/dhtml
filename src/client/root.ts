import type { Displayable } from '../shared.ts'
import type { CompiledTemplate } from './compiler.ts'
import type { Key } from './controller.ts'
import { is_html, single_part_template } from './html.ts'
import { assert } from './internal.ts'
import type { Part } from './parts.ts'
import { create_span, span_delete_contents, span_insert_node, type Span } from './span.ts'

export interface RootPublic {
	render(value: Displayable): void
	detach(): void
}
export interface Root extends RootPublic {
	_span: Span
	_key: Key | undefined
}

export function create_root_into(parent: Node): Root {
	const marker = new Text()
	parent.appendChild(marker)
	return create_root(create_span(marker))
}

export function create_root_after(node: Node): Root {
	assert(node.parentNode, 'expected a parent node')
	const marker = new Text()
	node.parentNode.insertBefore(marker, node.nextSibling)
	return create_root(create_span(marker))
}

export function create_root(span: Span): Root {
	let template: CompiledTemplate
	let parts: [number, Part][] | undefined

	function detach() {
		if (!parts) return
		// scan through all the parts of the previous tree, and clear any renderables.
		for (const [_idx, part] of parts) part.detach()
		parts = undefined
	}

	return {
		_span: span,
		_key: undefined,

		render: (value: Displayable) => {
			const html = is_html(value) ? value : single_part_template(value)

			if (template !== html._template) {
				detach()

				template = html._template

				const doc = template._content.cloneNode(true) as DocumentFragment

				const node_by_part: Array<Node | Span> = []

				for (const node of doc.querySelectorAll('[data-dynparts]')) {
					const parts = node.getAttribute('data-dynparts')
					assert(parts)
					node.removeAttribute('data-dynparts')
					// @ts-expect-error -- is part a number, is part a string, who cares?
					for (const part of parts.split(' ')) node_by_part[part] = node
				}

				for (const part of template._root_parts) node_by_part[part] = span

				// the fragment must be inserted before the parts are constructed,
				// because they need to know their final location.
				// this also ensures that custom elements are upgraded before we do things
				// to them, like setting properties or attributes.
				span_delete_contents(span)
				span_insert_node(span, doc)

				parts = html._template._parts.map(([dynamic_index, createPart], element_index) => [
					dynamic_index,
					createPart(node_by_part[element_index], span),
				])
			}

			assert(parts)
			for (const [idx, part] of parts) part.update(html._dynamics[idx])
		},

		detach,
	}
}
