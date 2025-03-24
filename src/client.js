/** @import { Root } from 'dhtml/client' */
import { create_root_into } from './client/root.js'

/** @type {(parent: Node) => Root} */
export const createRoot = create_root_into

export { getParentNode, invalidate, keyed, onMount, onUnmount } from './client/controller.js'
export { attr_directive as attr } from './client/parts.js'
