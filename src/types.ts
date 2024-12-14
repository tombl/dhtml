interface ToString {
	toString(): string
}

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable>
export interface Renderable {
	render(): Displayable
}

export declare class BoundTemplateInstance {
	#private
}

export type Key = string | number | bigint | boolean | symbol | object | null

export declare class Span {
	parentNode: Node
	start: number
	end: number

	constructor(parentNode: Node, start: number, end: number)

	deleteContents(): void
	insertNode(node: Node): void
	[Symbol.iterator](): IterableIterator<Node>
	extractContents(): DocumentFragment
	get length(): number
}

export interface Part {
	create(node: Node | Span, value: unknown): void
	update(value: unknown): void
	detach(): void
}

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, createPart: (prev: Part, span: Span) => Part][]
	_staticParts: [value: unknown, createPart: () => Part][]
	_rootParts: number[]
}
