import type { Displayable, Renderable, BoundTemplateInstance, Key, Span } from './types.ts'

export { Displayable, Renderable }

export function html(statics: TemplateStringsArray, ...dynamics: Displayable[]): BoundTemplateInstance
export function keyed<T extends Displayable & object>(value: T, key: Key): T
export function invalidate(renderable: Renderable): Promise<void>
export function onUnmount(renderable: Renderable, callback: () => void): void

export class Root {
	span: Span
	constructor(span: Span)

	static appendInto(parent: Node): Root
	static replace(node: Node): Root

	render(value: Displayable): void
	detach(): void
}
