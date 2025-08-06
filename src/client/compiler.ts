import { assert, lexer } from '../shared.ts'
import { is_comment, is_document_fragment, is_element } from './util.ts'

export const PART_CHILD = 0
export const PART_DIRECTIVE = 1
export const PART_ATTRIBUTE = 2
export const PART_PROPERTY = 3

export type PartData =
	| [type: typeof PART_CHILD, index: number]
	| [type: typeof PART_DIRECTIVE]
	| [type: typeof PART_ATTRIBUTE, name: string]
	| [type: typeof PART_PROPERTY, name: string]

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, PartData][]
	_root_parts: number[]
}

export const DYNAMIC_WHOLE: RegExp = /^dyn-\$(\d+)\$$/
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/g
const FORCE_ATTRIBUTES = /-|^class$|^for$/i
const NEEDS_UPPERCASING = /\$./g

function createPolicy<T extends { createHTML(input: string, ...args: unknown[]): string }>(_name: string, rules: T): T {
	return rules
}

declare var trustedTypes: { createPolicy: typeof createPolicy }

const policy = (typeof trustedTypes === 'undefined' ? createPolicy : trustedTypes.createPolicy.bind(trustedTypes))(
	'dhtml',
	{
		createHTML: (_text, statics: TemplateStringsArray) => {
			let i = 0
			return [...lexer.lex(statics)]
				.map(([char, state]) => {
					if (char === '\0') {
						if (state === lexer.DATA) return `<!--dyn-$${i++}$-->`
						else return `dyn-$${i++}$`
					}
					if (state === lexer.ATTR_NAME && char.toLowerCase() !== char) {
						return `$${char}`
					}
					return char
				})
				.join('')
		},
	},
)

const templates: WeakMap<TemplateStringsArray, CompiledTemplate> = new WeakMap()
export function compile_template(statics: TemplateStringsArray): CompiledTemplate {
	const cached = templates.get(statics)
	if (cached) return cached

	const template_element = document.createElement('template')
	template_element.innerHTML = policy.createHTML('', statics)

	let next_part = 0
	const compiled: CompiledTemplate = {
		_content: template_element.content,
		_parts: Array(statics.length - 1),
		_root_parts: [],
	}

	function patch(node: DocumentFragment | HTMLElement | SVGElement, idx: number, data: PartData) {
		assert(next_part < compiled._parts.length, 'got more parts than expected')
		if (is_document_fragment(node)) compiled._root_parts.push(next_part)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + next_part
		// @ts-expect-error -- this assigment will cast nextPart to a string
		else node.dataset.dynparts = next_part
		compiled._parts[next_part++] = [idx, data]
	}

	const walker = document.createTreeWalker(template_element.content, 129)
	assert((NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT) === 129)

	while (walker.nextNode()) {
		const node = walker.currentNode
		if (is_comment(node)) {
			const match = DYNAMIC_WHOLE.exec(node.data)
			if (match !== null) {
				const parent_node = node.parentNode
				assert(parent_node !== null, 'all text nodes should have a parent node')
				assert(
					parent_node instanceof DocumentFragment ||
						parent_node instanceof HTMLElement ||
						parent_node instanceof SVGElement,
				)

				// these will become the start and end of the span:
				parent_node.insertBefore(new Text(), node)
				parent_node.insertBefore(new Text(), node.nextSibling)

				patch(parent_node, parseInt(match[1]), [PART_CHILD, [...parent_node.childNodes].indexOf(node)])
			}
		} else {
			assert(is_element(node))
			assert(node instanceof HTMLElement || node instanceof SVGElement)

			for (const name of node.getAttributeNames()) {
				const value = node.getAttribute(name)
				assert(value !== null)

				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					// directive:
					node.removeAttribute(name)
					assert(value === '', `directives must not have values`)
					patch(node, parseInt(match[1]), [PART_DIRECTIVE])
				} else {
					// properties:
					match = DYNAMIC_WHOLE.exec(value)
					const remapped_name = name.replace(NEEDS_UPPERCASING, match => match[1].toUpperCase())
					if (match !== null) {
						node.removeAttribute(name)
						if (FORCE_ATTRIBUTES.test(remapped_name)) {
							patch(node, parseInt(match[1]), [PART_ATTRIBUTE, remapped_name])
						} else {
							patch(node, parseInt(match[1]), [PART_PROPERTY, remapped_name])
						}
					} else if (remapped_name !== name) {
						assert(!node.hasAttribute(remapped_name), `duplicate attribute ${remapped_name}`)
						node.setAttribute(remapped_name, value)
						node.removeAttribute(name)
					} else {
						assert(
							!DYNAMIC_GLOBAL.test(value),
							`expected a whole dynamic value for ${remapped_name}, got a partial one`,
						)
					}
				}
			}
		}
	}

	compiled._parts.length = next_part

	templates.set(statics, compiled)
	return compiled
}
