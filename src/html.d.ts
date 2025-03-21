import type { BoundTemplateInstance, Cleanup, Directive, Displayable, Key, Renderable, Span } from './types.ts'

export { Directive, Displayable, Renderable }

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): BoundTemplateInstance
export function keyed<T extends Displayable & object>(value: T, key: Key): T
export function invalidate(renderable: Renderable): Promise<void>
export function onMount(renderable: Renderable, callback: () => Cleanup): void
export function onUnmount(renderable: Renderable, callback: () => void): void
export function getParentNode(renderable: Renderable): Node

export interface Root {
	/* @internal */ _span: Span
	/* @internal */ _key: unknown
	render(value: Displayable): void
	detach(): void
}

export function createRoot(node: Node): Root

export function attr(name: string, value: string | boolean | null | undefined): Directive
