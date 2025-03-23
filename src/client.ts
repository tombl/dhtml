import { create_root_into, type RootPublic as Root } from './client/root.ts'

export const createRoot: (parent: Node) => Root = create_root_into
export type { Root }

export { getParentNode, invalidate, keyed, onMount, onUnmount } from './client/controller.ts'
export { attr_directive as attr, type Directive } from './client/parts.ts'
