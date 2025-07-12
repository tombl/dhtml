import { assert } from '../shared.ts'
import { is_document_fragment } from './util.ts'

export interface Span {
	readonly _parent: Node
	readonly _start: Node
	readonly _end: Node
}

export function create_span(node: Node): Span {
	assert(node.parentNode !== null)
	const start = new Text()
	const end = new Text()

	node.parentNode.insertBefore(start, node)
	node.parentNode.insertBefore(end, node.nextSibling)

	return {
		_parent: node.parentNode,
		_start: start,
		_end: end,
	}
}

export function insert_node(span: Span, node: Node): void {
	const end = is_document_fragment(node) ? node.lastChild : node
	if (end === null) return // empty fragment
	span._parent.insertBefore(node, span._end)
}

export function extract_contents(span: Span): DocumentFragment {
	const fragment = document.createDocumentFragment()

	let node = span._start.nextSibling
	for (;;) {
		assert(node)
		if (node === span._end) break
		const next = node.nextSibling
		fragment.appendChild(node)
		node = next
	}

	return fragment
}

export function delete_contents(span: Span): void {
	let node = span._start.nextSibling
	for (;;) {
		assert(node)
		if (node === span._end) break
		const next = node.nextSibling
		span._parent.removeChild(node)
		node = next
	}
}
