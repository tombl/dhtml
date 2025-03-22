import { create_root_into, type RootPublic as Root } from './client/root.ts'

export function createRoot(parent: Node): Root {
	return create_root_into(parent)
}
export type { Root }

export { getParentNode, invalidate, keyed, onMount, onUnmount } from './client/controller.ts'
export { attr_directive as attr, type Directive } from './client/parts.ts'
