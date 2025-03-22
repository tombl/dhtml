import type { CompiledTemplate } from './compiler.ts'
import type { Key } from './controller.ts'
import { isHtml, singlePartTemplate } from './html.ts'
import { assert } from './internal.ts'
import type { Part } from './parts.ts'
import { createSpan, spanDeleteContents, spanInsertNode, type Span } from './span.ts'
import type { Displayable } from './util.ts'

export interface Root {
	render(value: Displayable): void
	detach(): void
}
export interface RootInternal extends Root {
	_span: Span
	_key: Key | undefined
}

export function createRootInto(parent: Node): Root {
	const marker = new Text()
	parent.appendChild(marker)
	return createRoot(createSpan(marker))
}

export function createRootAfter(node: Node) {
	DEV: assert(node.parentNode, 'expected a parent node')
	const marker = new Text()
	node.parentNode.insertBefore(marker, node.nextSibling)
	return createRoot(createSpan(marker))
}

export function createRoot(span: Span): RootInternal {
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
			const html = isHtml(value) ? value : singlePartTemplate(value)

			if (template !== html._template) {
				detach()

				template = html._template

				const doc = template._content.cloneNode(true) as DocumentFragment

				const nodeByPart: Array<Node | Span> = []

				for (const node of doc.querySelectorAll('[data-dynparts]')) {
					const parts = node.getAttribute('data-dynparts')
					assert(parts)
					node.removeAttribute('data-dynparts')
					// @ts-expect-error -- is part a number, is part a string, who cares?
					for (const part of parts.split(' ')) nodeByPart[part] = node
				}

				for (const part of template._rootParts) nodeByPart[part] = span

				// the fragment must be inserted before the parts are constructed,
				// because they need to know their final location.
				// this also ensures that custom elements are upgraded before we do things
				// to them, like setting properties or attributes.
				spanDeleteContents(span)
				spanInsertNode(span, doc)

				parts = html._template._parts.map(([dynamicIdx, createPart], elementIdx) => [
					dynamicIdx,
					createPart(nodeByPart[elementIdx], span),
				])
			}

			assert(parts)
			for (const [idx, part] of parts) part.update(html._dynamics[idx])
		},

		detach,
	}
}
