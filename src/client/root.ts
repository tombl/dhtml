import { assert, is_html, single_part_template, type Displayable } from '../shared.ts'
import { compile_template, type CompiledTemplate } from './compiler.ts'
import type { Key } from './controller.ts'
import type { Part } from './parts.ts'
import { create_span_into, delete_contents, insert_node, type Span } from './span.ts'

export interface Root {
	render(value: Displayable): void
	/** @internal */ _span: Span
	/** @internal */ _key: Key | undefined
}

export function createRoot(parent: Node): Root {
	return create_root(create_span_into(parent))
}

export function create_root(span: Span): Root {
	let old_template: CompiledTemplate
	let parts: [number, Part][] | undefined

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
				if (parts !== undefined) {
					// scan through all the parts of the previous tree, and clear any renderables.
					for (const [_idx, part] of parts) part(null)
					parts = undefined
				}

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
				delete_contents(span)
				insert_node(span, doc)

				parts = template._parts.map(([dynamic_index, create_part], element_index) => [
					dynamic_index,
					create_part(node_by_part[element_index]),
				])
			}

			assert(parts)
			for (const [idx, part] of parts) part(dynamics[idx])
		},
	}
}
