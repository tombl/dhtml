import { assert } from '../shared.ts'

export interface Span {
	readonly _start: Node
	readonly _end: Node
}

export function create_span_into(parent: Node): Span {
	return { _start: parent.appendChild(new Text()), _end: parent.appendChild(new Text()) }
}

export function create_span_after(node: Node): Span {
	assert(node.parentNode !== null)

	return {
		_start: node.parentNode.insertBefore(new Text(), node.nextSibling),
		_end: node.parentNode.insertBefore(new Text(), node.nextSibling!.nextSibling),
	}
}

export function insert_node(span: Span, node: Node): void {
	span._end.parentNode!.insertBefore(node, span._end)
}

export function insert_span_before(span: Span, before: Node): void {
	const parent = before.parentNode
	assert(parent)
	const after = span._end.nextSibling

	if (after === before) return

	let node = span._start
	while (node !== after) {
		const next = node.nextSibling
		assert(next)
		parent.insertBefore(node, before)
		node = next
	}
}

export function delete_contents(span: Span): void {
	let node = span._start.nextSibling
	for (;;) {
		assert(node)
		if (node === span._end) break
		const next = node.nextSibling
		node.remove()
		node = next
	}
}
