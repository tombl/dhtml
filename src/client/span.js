/** @import { Span } from './types.js' */
import { assert } from '../shared.js'
import { is_document_fragment } from './util.js'

/**
 * @param {Node} node
 * @returns {Span}
 */
export function create_span(node) {
	assert(node.parentNode !== null)
	return {
		_parent: node.parentNode,
		_start: node,
		_end: node,
		_marker: null,
	}
}

/**
 * @param {Span} span
 * @param {Node} node
 * @returns {void}
 */
export function insert_node(span, node) {
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

/**
 * @param {Span} span
 * @returns {Generator<Node, void, unknown>}
 */
function* nodes(span) {
	let node = span._start
	for (;;) {
		const next = node.nextSibling
		yield node
		if (node === span._end) return
		assert(next, 'expected more siblings')
		node = next
	}
}

/**
 * @param {Span} span
 * @returns {DocumentFragment}
 */
export function extract_contents(span) {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	const fragment = document.createDocumentFragment()
	for (const node of nodes(span)) fragment.appendChild(node)

	span._start = span._end = span._marker
	return fragment
}

/**
 * @param {Span} span
 * @returns {void}
 */
export function delete_contents(span) {
	span._marker = new Text()
	span._parent.insertBefore(span._marker, span._start)

	for (const node of nodes(span)) span._parent.removeChild(node)

	span._start = span._end = span._marker
}
