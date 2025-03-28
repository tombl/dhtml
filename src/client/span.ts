import { assert } from '../shared.ts'
import { is_document_fragment } from './util.ts'

export interface Span {
	_parent: Node
	_start: Node
	_end: Node
	_marker: Node | null
}

export function create_span(node: Node): Span {
	assert(node.parentNode !== null)
	return {
		_parent: node.parentNode,
		_start: node,
		_end: node,
		_marker: null,
	}
}

export function insert_node(span: Span, node: Node): void {
	const end = is_document_fragment(node) ? node.lastChild : node
	if (end === null) return // empty fragment
	span._parent.insertBefore(node, span._end.nextSibling)
	span._end = end

	if (span._start === span._marker) {
		assert(span._start.nextSibling)
		span._start = span._start.nextSibling

		span._parent.removeChild(span._marker)
		span._marker = null
	}
}

function* nodes(span: Span): Generator<Node, void, unknown> {
	let node = span._start
	for (;;) {
		const next = node.nextSibling
		yield node
		if (node === span._end) return
		assert(next, 'expected more siblings')
		node = next
	}
}

export function extract_contents(span: Span): DocumentFragment {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	const fragment = document.createDocumentFragment()
	for (const node of nodes(span)) fragment.appendChild(node)

	span._start = span._end = span._marker
	return fragment
}

export function delete_contents(span: Span): void {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	for (const node of nodes(span)) span._parent.removeChild(node)

	span._start = span._end = span._marker
}
