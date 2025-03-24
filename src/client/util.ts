import { get_node_type } from './dom.ts'

export type Cleanup = (() => void) | void | undefined | null

export function is_element(node: Node): node is Element {
	return get_node_type(node) === (1 satisfies typeof Node.ELEMENT_NODE)
}

export function is_text(node: Node): node is Text {
	return get_node_type(node) === (3 satisfies typeof Node.TEXT_NODE)
}

export function is_comment(node: Node): node is Comment {
	return get_node_type(node) === (8 satisfies typeof Node.COMMENT_NODE)
}

export function is_document_fragment(node: Node): node is DocumentFragment {
	return get_node_type(node) === (11 satisfies typeof Node.DOCUMENT_FRAGMENT_NODE)
}
