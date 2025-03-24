import { Root as RootPublic } from 'dhtml/client'

export interface Part {
	update(value: unknown): void
	detach(): void
}

export interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, createPart: (node: Node | Span, span: Span) => Part][]
	_root_parts: number[]
}

export interface Span {
	_parent: Node
	_start: Node
	_end: Node
	_marker: Node | null
}

export interface Root extends RootPublic {
	_span: Span
	_key?: unknown
}

export interface Controller {
	_mount_callbacks?: Set<Cleanup> // undefined if mounted
	_unmount_callbacks: Set<Cleanup>

	_invalidate_queued?: Promise<void>
	_invalidate?: () => void
	_parent_node?: Node
}

export type Key = string | number | bigint | boolean | symbol | object | null
