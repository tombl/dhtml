import { assert } from '../shared.ts'
import { append_child, get_next_sibling, insert_before, remove_child } from './dom.ts'
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
	insert_before(span._parent, node, get_next_sibling(span._end))
	span._end = end

	if (span._start === span._marker) {
		const sibling = get_next_sibling(span._start)
		assert(sibling)
		span._start = sibling

		remove_child(span._parent, span._marker)
		span._marker = null
	}
}

function* nodes(span: Span): Generator<Node, void, unknown> {
	let node = span._start
	for (;;) {
		const next = get_next_sibling(node)
		yield node
		if (node === span._end) return
		assert(next, 'expected more siblings')
		node = next
	}
}

export function extract_contents(span: Span): DocumentFragment {
	span._marker = document.createTextNode('')
	insert_before(span._parent, span._marker, span._start)

	const fragment = document.createDocumentFragment()

	for (const node of nodes(span)) append_child(fragment, node)

	span._start = span._end = span._marker
	return fragment
}

export function delete_contents(span: Span): void {
	span._marker = document.createTextNode('')
	insert_before(span._parent, span._marker, span._start)

	for (const node of nodes(span)) remove_child(span._parent, node)

	span._start = span._end = span._marker
}
