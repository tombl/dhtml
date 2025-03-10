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

export type Key = string | number | bigint | boolean | symbol | object | null

export declare class Span {
	_start: Node | null
	_end: Node | null
}

export interface Part {
	create(node: Node | Span, value: unknown): void
	update(value: unknown): void
	detach(): void
}

export type Cleanup = (() => void) | void | undefined | null
export type Directive = (node: Element) => Cleanup

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, createPart: (span: Span) => Part][]
	_rootParts: number[]
}
