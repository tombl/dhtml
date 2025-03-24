/** @import { Displayable } from 'dhtml' */
/** @import { CompiledTemplate, Part, Span, Root } from './types.js' */
import { assert, is_html, single_part_template } from '../shared.js'
import { compile_template } from './compiler.js'
import { create_span, delete_contents, insert_node } from './span.js'

/**
 * @param {Node} parent
 * @returns {Root}
 */
export function create_root_into(parent) {
	const marker = new Text()
	parent.appendChild(marker)
	return create_root(create_span(marker))
}

/**
 * @param {Node} node
 * @returns {Root}
 */
export function create_root_after(node) {
	assert(node.parentNode, 'expected a parent node')
	const marker = new Text()
	node.parentNode.insertBefore(marker, node.nextSibling)
	return create_root(create_span(marker))
}

/**
 * @param {Span} span
 * @returns {Root}
 */
export function create_root(span) {
	/** @type {CompiledTemplate} */
	let old_template
	/** @type {[number, Part][] | undefined} */
	let parts

	function detach() {
		if (!parts) return
		// scan through all the parts of the previous tree, and clear any renderables.
		for (const [_idx, part] of parts) part(null)
		parts = undefined
	}

	return {
		_span: span,
		_key: undefined,

		/**
		 * @param {Displayable} value
		 */
		render: value => {
			const { _dynamics: dynamics, _statics: statics } = is_html(value) ? value : single_part_template(value)
			const template = compile_template(statics)

			assert(
				template._parts.length === dynamics.length,
				'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
			)

			if (old_template !== template) {
				detach()

				old_template = template

				const doc = /** @type {DocumentFragment} */ (old_template._content.cloneNode(true))

				/** @type {Array<Node | Span>} */
				const node_by_part = []

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

				parts = template._parts.map(([dynamic_index, createPart], element_index) => [
					dynamic_index,
					createPart(node_by_part[element_index], span),
				])
			}

			assert(parts)
			for (const [idx, part] of parts) part(dynamics[idx])
		},

		detach,
	}
}
