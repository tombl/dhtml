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

export function swap_contents(span: Span, other: Span): void {
	other._marker = new Text()
	other._parent.insertBefore(other._marker, other._start)
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	const tmp = document.createDocumentFragment()

	for (const node of nodes(other)) tmp.appendChild(node)
	other._start = other._end = other._marker
	for (const node of nodes(span)) insert_node(other, node)
	span._start = span._end = span._marker

	insert_node(span, tmp)
}

export function delete_contents(span: Span): void {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	for (const node of nodes(span)) span._parent.removeChild(node)

	span._start = span._end = span._marker
}
