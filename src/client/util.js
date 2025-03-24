/** @import { Cleanup } from './types.js' */

/** @type {typeof Node.ELEMENT_NODE} */
const ELEMENT_NODE = 1

/** @type {typeof Node.TEXT_NODE} */
const TEXT_NODE = 3

/** @type {typeof Node.COMMENT_NODE} */
const COMMENT_NODE = 8

/** @type {typeof Node.DOCUMENT_FRAGMENT_NODE} */
const DOCUMENT_FRAGMENT_NODE = 11

/**
 * @param {Node} node
 * @returns {node is Element}
 */
export function is_element(node) {
	return node.nodeType === ELEMENT_NODE
}

/**
 * @param {Node} node
 * @returns {node is Text}
 */
export function is_text(node) {
	return node.nodeType === TEXT_NODE
}

/**
 * @param {Node} node
 * @returns {node is Comment}
 */
export function is_comment(node) {
	return node.nodeType === COMMENT_NODE
}

/**
 * @param {Node} node
 * @returns {node is DocumentFragment}
 */
export function is_document_fragment(node) {
	return node.nodeType === DOCUMENT_FRAGMENT_NODE
}
