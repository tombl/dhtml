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

export function extract_contents(span: Span): DocumentFragment {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	const fragment = document.createDocumentFragment()

	for (let node = span._start, next; (next = node.nextSibling); node = next) {
		fragment.appendChild(node)
		if (node === span._end) break
	}

	span._start = span._end = span._marker
	return fragment
}

export function delete_contents(span: Span): void {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	for (let node = span._start, next; (next = node.nextSibling); node = next) {
		span._parent.removeChild(node)
		if (node === span._end) break
	}

	span._start = span._end = span._marker
}
