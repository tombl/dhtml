export function is_element(node: Node): node is Element {
	return node.nodeType === (1 satisfies typeof Node.ELEMENT_NODE)
}

export function is_text(node: Node): node is Text {
	return node.nodeType === (3 satisfies typeof Node.TEXT_NODE)
}

export function is_comment(node: Node): node is Comment {
	return node.nodeType === (8 satisfies typeof Node.COMMENT_NODE)
}

export function is_document_fragment(node: Node): node is DocumentFragment {
	return node.nodeType === (11 satisfies typeof Node.DOCUMENT_FRAGMENT_NODE)
}
