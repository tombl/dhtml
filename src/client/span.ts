import { assert } from './internal.ts'
import { is_document_fragment } from './util.ts'

export interface Span {
	_parent: Node
	_start: Node
	_end: Node
	_marker: Node | null
}

export function create_span(node: Node): Span {
	DEV: assert(node.parentNode !== null)
	return {
		_parent: node.parentNode,
		_start: node,
		_end: node,
		_marker: null,
	}
}

export function span_insert_node(span: Span, node: Node) {
	const end = is_document_fragment(node) ? node.lastChild : node
	if (end === null) return // empty fragment
	span._parent.insertBefore(node, span._end.nextSibling)
	span._end = end

	if (span._start === span._marker) {
		DEV: assert(span._start.nextSibling)
		span._start = span._start.nextSibling

		span._parent.removeChild(span._marker)
		span._marker = null
	}
}

export function* span_iterator(span: Span) {
	let node = span._start
	for (;;) {
		const next = node.nextSibling
		yield node
		if (node === span._end) return
		assert(next, 'expected more siblings')
		node = next
	}
}

export function span_extract_contents(span: Span) {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	const fragment = document.createDocumentFragment()
	for (const node of span_iterator(span)) fragment.appendChild(node)

	span._start = span._end = span._marker
	return fragment
}

export function span_delete_contents(span: Span) {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	for (const node of span_iterator(span)) span._parent.removeChild(node)

	span._start = span._end = span._marker
}
