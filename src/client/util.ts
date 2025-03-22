interface ToString {
	toString(): string
}

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable>
export interface Renderable {
	render(): Displayable
}

export type Cleanup = (() => void) | void | undefined | null

export const isElement = (node: Node): node is Element => node.nodeType === (1 satisfies typeof Node.ELEMENT_NODE)

export const isText = (node: Node): node is Text => node.nodeType === (3 satisfies typeof Node.TEXT_NODE)

export const isComment = (node: Node): node is Comment => node.nodeType === (8 satisfies typeof Node.COMMENT_NODE)

export const isDocumentFragment = (node: Node): node is DocumentFragment =>
	node.nodeType === (11 satisfies typeof Node.DOCUMENT_FRAGMENT_NODE)

export const isRenderable = (value: unknown): value is Renderable =>
	typeof value === 'object' && value !== null && 'render' in value

export const isIterable = (value: unknown): value is Iterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.iterator in value
