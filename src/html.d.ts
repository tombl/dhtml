import type { BoundTemplateInstance, CustomPartConstructor, Displayable, Key, Renderable } from './types.ts'

export { CustomPartConstructor as CustomPart, Displayable, Renderable }

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): BoundTemplateInstance
export function keyed<T extends Displayable & object>(value: T, key: Key): T
export function invalidate(renderable: Renderable): Promise<void>
export function onUnmount(renderable: Renderable, callback: () => void): void
export function getParentNode(renderable: Renderable): Node

export class Root {
	static appendInto(parent: Node): Root
	static replace(node: Node): Root

	render(value: Displayable): void
	detach(): void
}
