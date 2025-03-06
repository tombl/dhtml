import type { BoundTemplateInstance, Cleanup, Directive, Displayable, Key, Renderable } from './types.ts'

export { Directive, Displayable, Renderable }

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): BoundTemplateInstance
export function keyed<T extends Displayable & object>(value: T, key: Key): T
export function invalidate(renderable: Renderable): Promise<void>
export function onMount(renderable: Renderable, callback: () => Cleanup): void
export function onUnmount(renderable: Renderable, callback: () => void): void
export function getParentNode(renderable: Renderable): Node

export interface Root {
	render(value: Displayable): void
	detach(): void
}

export function createRoot(node: Node): Root

export function attr(name: string): Directive<string | boolean | null | undefined>
