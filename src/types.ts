declare global {
	const DHTML_PROD: unknown
}

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

export declare class Span {
	parentNode: ParentNode
	_start: Node | null
	_end: Node | null
}

export interface Part {
	create(node: Node | Span, value: unknown): void
	update(value: unknown): void
	detach(): void
}

export interface CustomPartInstance<T> {
	update?(value: T): void
	detach?(): void
}
export type CustomPartConstructor<T = unknown> =
	| ((node: Element, value: T) => CustomPartInstance<T>)
	| (new (node: Element, value: T) => CustomPartInstance<T>)

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, createPart: (prev: Part, span: Span) => Part][]
	_staticParts: [value: unknown, createPart: () => Part][]
	_rootParts: number[]
}
