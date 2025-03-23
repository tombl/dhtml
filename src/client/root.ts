import type { Displayable } from 'dhtml'
import { assert, is_html, single_part_template } from '../shared.ts'
import { compile_template, type CompiledTemplate } from './compiler.ts'
import type { Key } from './controller.ts'
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
	let old_template: CompiledTemplate
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
			const { _dynamics: dynamics, _statics: statics } = is_html(value) ? value : single_part_template(value)
			const template = compile_template(statics)

			assert(
				template._parts.length === dynamics.length,
				'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
			)

			if (old_template !== template) {
				detach()

				old_template = template

				const doc = old_template._content.cloneNode(true) as DocumentFragment

				const node_by_part: Array<Node | Span> = []

				for (const node of doc.querySelectorAll('[data-dynparts]')) {
					const parts = node.getAttribute('data-dynparts')
					assert(parts)
					node.removeAttribute('data-dynparts')
					// @ts-expect-error -- is part a number, is part a string, who cares?
					for (const part of parts.split(' ')) node_by_part[part] = node
				}

				for (const part of old_template._root_parts) node_by_part[part] = span

				// the fragment must be inserted before the parts are constructed,
				// because they need to know their final location.
				// this also ensures that custom elements are upgraded before we do things
				// to them, like setting properties or attributes.
				span_delete_contents(span)
				span_insert_node(span, doc)

				parts = template._parts.map(([dynamic_index, createPart], element_index) => [
					dynamic_index,
					createPart(node_by_part[element_index], span),
				])
			}

			assert(parts)
			for (const [idx, part] of parts) part.update(dynamics[idx])
		},

		detach,
	}
}
