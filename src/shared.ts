interface ToString {
	toString(): string
}

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable>
export interface Renderable {
	render(): Displayable
}

export const is_renderable = (value: unknown): value is Renderable =>
	typeof value === 'object' && value !== null && 'render' in value

export const is_iterable = (value: unknown): value is Iterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.iterator in value

declare global {
	var __DEV__: boolean
}

export function assert(value: unknown, message?: string): asserts value {
	if (!__DEV__) return
	if (!value) throw new Error(message ?? 'assertion failed')
}

const tag: unique symbol = Symbol()

interface HTML {
	[tag]: true
	/* @internal */ _statics: TemplateStringsArray
	/* @internal */ _dynamics: unknown[]
}

export const is_html = (value: any): value is HTML => typeof value === 'object' && value !== null && tag in value

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML {
	return {
		[tag]: true,
		_dynamics: dynamics,
		_statics: statics,
	}
}

export const single_part_template = (part: Displayable): HTML => html`${part}`
