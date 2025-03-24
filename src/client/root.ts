import { assert, is_html, single_part_template, type Displayable } from '../shared.ts'
import { compile_template, type CompiledTemplate } from './compiler.ts'
import type { Key } from './controller.ts'
import type { Part } from './parts.ts'
import { create_span, delete_contents, insert_node, type Span } from './span.ts'

export interface Root {
	render(value: Displayable): void
	detach(): void
	/** @internal */ _span: Span
	/** @internal */ _key: Key | undefined
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
	let parts: { _dynamic: number; _part: number; _run: Part }[] | undefined
	let node_by_part: Array<Node | Span> = []

	function detach() {
		if (!parts) return
		// scan through all the parts of the previous tree, and clear any renderables.
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]
			part._run(node_by_part[part._part], null, span)
		}
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
				old_template = template
				detach()
				node_by_part = []

				const doc = template._content.cloneNode(true) as DocumentFragment

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
				delete_contents(span)
				insert_node(span, doc)

				parts = template._parts.map(([dynamic, run], part) => ({
					_dynamic: dynamic,
					_part: part,
					_run: run,
				}))
			}

			assert(parts)
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i]
				part._run(node_by_part[part._part], dynamics[part._dynamic], span)
			}
		},

		detach,
	}
}
