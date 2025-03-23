import type { Renderable } from '../shared.ts'

export type Cleanup = (() => void) | void | undefined | null

export const is_element = (node: Node): node is Element => node.nodeType === (1 satisfies typeof Node.ELEMENT_NODE)

export const is_text = (node: Node): node is Text => node.nodeType === (3 satisfies typeof Node.TEXT_NODE)

export const is_comment = (node: Node): node is Comment => node.nodeType === (8 satisfies typeof Node.COMMENT_NODE)

export const is_document_fragment = (node: Node): node is DocumentFragment =>
	node.nodeType === (11 satisfies typeof Node.DOCUMENT_FRAGMENT_NODE)
