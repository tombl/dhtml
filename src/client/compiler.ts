import { assert, DEV } from './internal.ts'
import { createAttributePart, createChildPart, createDirectivePart, createPropertyPart, type Part } from './parts.ts'
import type { Span } from './span.ts'
import { isComment, isDocumentFragment, isElement, isText } from './util.ts'

const NODE_FILTER_ELEMENT: typeof NodeFilter.SHOW_ELEMENT = 1
const NODE_FILTER_TEXT: typeof NodeFilter.SHOW_TEXT = 4
const NODE_FILTER_COMMENT: typeof NodeFilter.SHOW_COMMENT = 128

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, createPart: (node: Node | Span, span: Span) => Part][]
	_rootParts: number[]
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/gi
const FORCE_ATTRIBUTES = /-|^class$|^for$/i

const templates: Map<TemplateStringsArray, CompiledTemplate> = new Map()
export function compileTemplate(statics: TemplateStringsArray) {
	const cached = templates.get(statics)
	if (cached) return cached

	const templateElement = document.createElement('template')
	templateElement.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}$`), '')

	let nextPart = 0

	const compiled: CompiledTemplate = {
		_content: templateElement.content,
		_parts: Array(statics.length - 1),
		_rootParts: [],
	}

	function patch(
		node: DocumentFragment | HTMLElement | SVGElement,
		idx: number,
		createPart: (node: Node | Span, span: Span) => Part,
	) {
		DEV: assert(nextPart < compiled._parts.length, 'got more parts than expected')
		if (isDocumentFragment(node)) compiled._rootParts.push(nextPart)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + nextPart
		// @ts-expect-error -- this assigment will cast nextPart to a string
		else node.dataset.dynparts = nextPart
		compiled._parts[nextPart++] = [idx, createPart]
	}

	const walker = document.createTreeWalker(
		templateElement.content,
		NODE_FILTER_TEXT | NODE_FILTER_ELEMENT | (DEV ? NODE_FILTER_COMMENT : 0),
	)
	// stop iterating once we've hit the last part, but if we're in dev mode, keep going to check for mistakes.
	while ((nextPart < compiled._parts.length || DEV) && walker.nextNode()) {
		const node = walker.currentNode
		if (isText(node)) {
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
				const parentNode = node.parentNode
				DEV: assert(parentNode !== null, 'all text nodes should have a parent node')
				DEV: assert(
					parentNode instanceof DocumentFragment ||
						parentNode instanceof HTMLElement ||
						parentNode instanceof SVGElement,
				)
				let siblings = [...parentNode.childNodes]
				for (const [node, idx] of nodes) {
					const child = siblings.indexOf(node)
					patch(parentNode, idx, (node, span) => createChildPart(node, span, child))
				}
			}
		} else if (DEV && isComment(node)) {
			// just in dev, stub out a fake part for every interpolation in a comment.
			// this means you can comment out code inside a template and not run into
			// issues with incorrect part counts.
			// in production the check is skipped, so we can also skip this.
			for (const _match of node.data.matchAll(DYNAMIC_GLOBAL)) {
				compiled._parts[nextPart++] = [parseInt(_match[1]), () => ({ update() {}, detach() {} })]
			}
		} else {
			assert(isElement(node))
			DEV: assert(node instanceof HTMLElement || node instanceof SVGElement)

			const toRemove = []
			for (let name of node.getAttributeNames()) {
				const value = node.getAttribute(name)
				assert(value !== null)

				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					// directive:
					toRemove.push(name)
					DEV: assert(value === '', `directives must not have values`)
					patch(node, parseInt(match[1]), node => {
						DEV: assert(node instanceof Node)
						return createDirectivePart(node)
					})
				} else {
					// properties:
					match = DYNAMIC_WHOLE.exec(value)
					if (match !== null) {
						toRemove.push(name)
						if (FORCE_ATTRIBUTES.test(name)) {
							patch(node, parseInt(match[1]), node => {
								DEV: assert(node instanceof Element)
								return createAttributePart(node, name)
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
								DEV: assert(node instanceof Node)
								return createPropertyPart(node, name)
							})
						}
					} else if (DEV) {
						assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
					}
				}
			}
			for (const name of toRemove) node.removeAttribute(name)
		}
	}

	compiled._parts.length = nextPart

	templates.set(statics, compiled)
	return compiled
}
