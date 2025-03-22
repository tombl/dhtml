import { assert } from './internal.ts'
import { isDocumentFragment } from './util.ts'

export interface Span {
	_parentNode: Node
	_start: Node
	_end: Node
	_marker: Node | null
}

export function createSpan(node: Node): Span {
	DEV: assert(node.parentNode !== null)
	return {
		_parentNode: node.parentNode,
		_start: node,
		_end: node,
		_marker: null,
	}
}

export function spanInsertNode(span: Span, node: Node) {
	const end = isDocumentFragment(node) ? node.lastChild : node
	if (end === null) return // empty fragment
	span._parentNode.insertBefore(node, span._end.nextSibling)
	span._end = end

	if (span._start === span._marker) {
		DEV: assert(span._start.nextSibling)
		span._start = span._start.nextSibling

		span._parentNode.removeChild(span._marker)
		span._marker = null
	}
}

export function* spanIterator(span: Span) {
	let node = span._start
	for (;;) {
		const next = node.nextSibling
		yield node
		if (node === span._end) return
		assert(next, 'expected more siblings')
		node = next
	}
}

export function spanExtractContents(span: Span) {
	span._marker = new Text()
	span._parentNode.insertBefore(span._marker, span._start)

	const fragment = document.createDocumentFragment()
	for (const node of spanIterator(span)) fragment.appendChild(node)

	span._start = span._end = span._marker
	return fragment
}

export function spanDeleteContents(span: Span) {
	span._marker = new Text()
	span._parentNode.insertBefore(span._marker, span._start)

	for (const node of spanIterator(span)) span._parentNode.removeChild(node)

	span._start = span._end = span._marker
}
