import { assert, DEV } from './internal.ts'
import {
	create_attribute_part,
	create_child_part,
	create_directive_part,
	createPropertyPart,
	type Part,
} from './parts.ts'
import type { Span } from './span.ts'
import { is_comment, is_document_fragment, is_element, is_text } from './util.ts'

const NODE_FILTER_ELEMENT: typeof NodeFilter.SHOW_ELEMENT = 1
const NODE_FILTER_TEXT: typeof NodeFilter.SHOW_TEXT = 4
const NODE_FILTER_COMMENT: typeof NodeFilter.SHOW_COMMENT = 128

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, createPart: (node: Node | Span, span: Span) => Part][]
	_root_parts: number[]
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/gi
const FORCE_ATTRIBUTES = /-|^class$|^for$/i

const templates: Map<TemplateStringsArray, CompiledTemplate> = new Map()
export function compile_template(statics: TemplateStringsArray) {
	const cached = templates.get(statics)
	if (cached) return cached

	const template_element = document.createElement('template')
	template_element.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}$`), '')

	let next_part = 0

	const compiled: CompiledTemplate = {
		_content: template_element.content,
		_parts: Array(statics.length - 1),
		_root_parts: [],
	}

	function patch(
		node: DocumentFragment | HTMLElement | SVGElement,
		idx: number,
		createPart: (node: Node | Span, span: Span) => Part,
	) {
		assert(next_part < compiled._parts.length, 'got more parts than expected')
		if (is_document_fragment(node)) compiled._root_parts.push(next_part)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + next_part
		// @ts-expect-error -- this assigment will cast nextPart to a string
		else node.dataset.dynparts = next_part
		compiled._parts[next_part++] = [idx, createPart]
	}

	const walker = document.createTreeWalker(
		template_element.content,
		NODE_FILTER_TEXT | NODE_FILTER_ELEMENT | (DEV ? NODE_FILTER_COMMENT : 0),
	)
	// stop iterating once we've hit the last part, but if we're in dev mode, keep going to check for mistakes.
	while ((next_part < compiled._parts.length || DEV) && walker.nextNode()) {
		const node = walker.currentNode
		if (is_text(node)) {
			// reverse the order because we'll be supplying ChildPart with its index in the parent node.
			// and if we apply the parts forwards, indicies will be wrong if some prior part renders more than one node.
			// also reverse it because that's the correct order for splitting.
			const nodes = [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse().map(match => {
				node.splitText(match.index + match[0].length)
				const dyn = new Comment()
				node.splitText(match.index).replaceWith(dyn)
				return [dyn, parseInt(match[1])] as const
			})

			if (nodes.length) {
				const parent_node = node.parentNode
				assert(parent_node !== null, 'all text nodes should have a parent node')
				assert(
					parent_node instanceof DocumentFragment ||
						parent_node instanceof HTMLElement ||
						parent_node instanceof SVGElement,
				)
				let siblings = [...parent_node.childNodes]
				for (const [node, idx] of nodes) {
					const child = siblings.indexOf(node)
					patch(parent_node, idx, (node, span) => create_child_part(node, span, child))
				}
			}
		} else if (DEV && is_comment(node)) {
			// just in dev, stub out a fake part for every interpolation in a comment.
			// this means you can comment out code inside a template and not run into
			// issues with incorrect part counts.
			// in production the check is skipped, so we can also skip this.
			for (const _match of node.data.matchAll(DYNAMIC_GLOBAL)) {
				compiled._parts[next_part++] = [parseInt(_match[1]), () => ({ update() {}, detach() {} })]
			}
		} else {
			assert(is_element(node))
			assert(node instanceof HTMLElement || node instanceof SVGElement)

			const to_remove = []
			for (let name of node.getAttributeNames()) {
				const value = node.getAttribute(name)
				assert(value !== null)

				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					// directive:
					to_remove.push(name)
					assert(value === '', `directives must not have values`)
					patch(node, parseInt(match[1]), node => {
						assert(node instanceof Node)
						return create_directive_part(node)
					})
				} else {
					// properties:
					match = DYNAMIC_WHOLE.exec(value)
					if (match !== null) {
						to_remove.push(name)
						if (FORCE_ATTRIBUTES.test(name)) {
							patch(node, parseInt(match[1]), node => {
								assert(node instanceof Element)
								return create_attribute_part(node, name)
							})
						} else {
							if (!(name in node)) {
								for (const property in node) {
									if (property.toLowerCase() === name) {
										name = property
										break
									}
								}
							}
							patch(node, parseInt(match[1]), node => {
								assert(node instanceof Node)
								return createPropertyPart(node, name)
							})
						}
					} else if (DEV) {
						assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
					}
				}
			}
			for (const name of to_remove) node.removeAttribute(name)
		}
	}

	compiled._parts.length = next_part

	templates.set(statics, compiled)
	return compiled
}
