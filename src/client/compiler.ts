import { assert } from '../shared.ts'
import {
	create_attribute_part,
	create_child_part,
	create_directive_part,
	create_property_part,
	type Part,
} from './parts.ts'
import type { Span } from './span.ts'
import { is_comment, is_document_fragment, is_element } from './util.ts'

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, create_part: (node: Node | Span, span: Span) => Part][]
	_root_parts: number[]
}

const ALPHA = /[a-z]/i
const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/g
const FORCE_ATTRIBUTES = /-|^class$|^for$/i

function generate_html(statics: TemplateStringsArray) {
	assert(!statics.some(s => s.includes('\0')))

	const input = statics.join('\0')
	let output = ''

	const DATA = 0
	const TAG_OPEN = 1
	const END_TAG_OPEN = 2
	const TAG_NAME = 3
	const BEFORE_ATTR_NAME = 4
	const ATTR_NAME = 5
	const AFTER_ATTR_NAME = 6
	const BEFORE_ATTR_VALUE = 7
	const ATTR_VALUE_DOUBLE_QUOTED = 8
	const ATTR_VALUE_SINGLE_QUOTED = 9
	const ATTR_VALUE_UNQUOTED = 10
	const AFTER_ATTR_VALUE = 11
	const SELF_CLOSING_START_TAG = 12
	const COMMENT2 = 13 // a comment2 is any type of comment that ends with ">" and not "-->"
	const EXCLAIM = 14
	const COMMENT = 15

	type State =
		| typeof DATA
		| typeof TAG_OPEN
		| typeof END_TAG_OPEN
		| typeof TAG_NAME
		| typeof BEFORE_ATTR_NAME
		| typeof ATTR_NAME
		| typeof AFTER_ATTR_NAME
		| typeof BEFORE_ATTR_VALUE
		| typeof ATTR_VALUE_DOUBLE_QUOTED
		| typeof ATTR_VALUE_SINGLE_QUOTED
		| typeof ATTR_VALUE_UNQUOTED
		| typeof AFTER_ATTR_VALUE
		| typeof SELF_CLOSING_START_TAG
		| typeof COMMENT2
		| typeof EXCLAIM
		| typeof COMMENT

	let state: State = DATA
	let i = 0
	let dyn_i = 0
	let skip = false

	function pop() {
		const c = input[i++]

		if (skip) {
			skip = false
			return
		}

		if (c === '\0') {
			output += state === DATA ? `<!--dyn-$${dyn_i++}$-->` : `dyn-$${dyn_i++}$`
			return
		}

		output += c
		return c
	}
	function rewind() {
		i--
		skip = true
	}

	while (i < input.length) {
		const c = pop()
		if (c === undefined) continue

		switch (state) {
			case DATA: // https://html.spec.whatwg.org/multipage/parsing.html#data-state
				if (c === '<') state = TAG_OPEN
				break

			case TAG_OPEN: // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
				if (c === '!') state = EXCLAIM
				else if (c === '/') state = END_TAG_OPEN
				else if (c === '?') state = COMMENT2
				else {
					rewind()
					state = TAG_NAME
				}
				break

			case END_TAG_OPEN: // https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
				if (c === '>') state = DATA
				else if (ALPHA.test(c)) {
					rewind()
					state = TAG_NAME
				} else {
					rewind()
					state = COMMENT2
				}
				break

			case TAG_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#tag-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '>') state = DATA
				break

			case BEFORE_ATTR_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
				} else if (c === '/' || c === '>') {
					rewind()
					state = AFTER_ATTR_NAME
				} else {
					rewind()
					state = ATTR_NAME
				}
				break

			case ATTR_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ' || c === '/' || c === '>') {
					rewind()
					state = AFTER_ATTR_NAME
				} else if (c === '=') state = BEFORE_ATTR_VALUE
				break

			case AFTER_ATTR_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ' || c === '/') {
				} else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '=') state = BEFORE_ATTR_VALUE
				else if (c === '>') state = DATA
				else {
					rewind()
					state = ATTR_NAME
				}
				break

			case BEFORE_ATTR_VALUE: // https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-value-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
				} else if (c === '"') state = ATTR_VALUE_DOUBLE_QUOTED
				else if (c === "'") state = ATTR_VALUE_SINGLE_QUOTED
				else if (c === '>') state = DATA
				else if (c === '=') {
					rewind()
					state = ATTR_VALUE_UNQUOTED
				}
				break

			case ATTR_VALUE_DOUBLE_QUOTED: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
				if (c === '"') state = AFTER_ATTR_VALUE
				break

			case ATTR_VALUE_SINGLE_QUOTED: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(single-quoted)-state
				if (c === "'") state = AFTER_ATTR_VALUE
				break

			case ATTR_VALUE_UNQUOTED: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(unquoted)-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '>') state = DATA
				break

			case AFTER_ATTR_VALUE: // https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-value-(quoted)-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '>') state = DATA
				else {
					rewind()
					state = BEFORE_ATTR_NAME
				}
				break

			case SELF_CLOSING_START_TAG: // https://html.spec.whatwg.org/multipage/parsing.html#self-closing-start-tag-state
				if (c === '>') state = DATA
				else {
					rewind()
					state = BEFORE_ATTR_NAME
				}
				break

			case COMMENT2: // https://html.spec.whatwg.org/multipage/parsing.html#bogus-comment-state
				if (c === '>') state = DATA
				break

			case EXCLAIM: // https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
				if (c === '-' && input[i] === '-') {
					pop()
					state = COMMENT
				} else {
					state = COMMENT2
				}
				break

			case COMMENT: // https://html.spec.whatwg.org/multipage/parsing.html#comment-state
				if (c === '-' && input[i] === '-' && input[i + 1] === '>') {
					pop()
					pop()
					state = DATA
				}
				break

			default:
				state satisfies never
		}
	}

	return output
}

const templates: WeakMap<TemplateStringsArray, CompiledTemplate> = new WeakMap()
export function compile_template(statics: TemplateStringsArray): CompiledTemplate {
	const cached = templates.get(statics)
	if (cached) return cached

	const template_element = document.createElement('template')
	template_element.innerHTML = generate_html(statics)

	let next_part = 0

	const compiled: CompiledTemplate = {
		_content: template_element.content,
		_parts: Array(statics.length - 1),
		_root_parts: [],
	}

	function patch(
		node: DocumentFragment | HTMLElement | SVGElement,
		idx: number,
		create_part: (node: Node | Span, span: Span) => Part,
	) {
		assert(next_part < compiled._parts.length, 'got more parts than expected')
		if (is_document_fragment(node)) compiled._root_parts.push(next_part)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + next_part
		// @ts-expect-error -- this assigment will cast nextPart to a string
		else node.dataset.dynparts = next_part
		compiled._parts[next_part++] = [idx, create_part]
	}

	const walker = document.createTreeWalker(template_element.content, 129)
	assert((NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT) === 129)

	// stop iterating once we've hit the last part, but if we're in dev mode, keep going to check for mistakes.
	while ((next_part < compiled._parts.length || __DEV__) && walker.nextNode()) {
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
				const child = [...parent_node.childNodes].indexOf(node)
				patch(parent_node, parseInt(match[1]), (node, span) => create_child_part(node, span, child))
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
								name = (correct_case_cache[node.tagName] ??= generate_case_map(node))[name]
							}
							patch(node, parseInt(match[1]), node => {
								assert(node instanceof Node)
								return create_property_part(node, name)
							})
						}
					} else {
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

const correct_case_cache: Record<string, Record<string, string>> = {}
function generate_case_map(node: Node) {
	const cache: Record<string, string> = {}

	while (node !== null) {
		for (const prop of Object.getOwnPropertyNames(node)) {
			cache[prop.toLowerCase()] ??= prop
		}
		node = Object.getPrototypeOf(node)
	}

	return cache
}
