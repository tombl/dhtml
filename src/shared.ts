import { html, type Displayable, type HTML, type Renderable } from 'dhtml'

declare global {
	var __DEV__: boolean
}

export const is_renderable = (value: unknown): value is Renderable =>
	typeof value === 'object' && value !== null && 'render' in value

export const is_iterable = (value: unknown): value is Iterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.iterator in value

export function assert(value: unknown, message?: string): asserts value {
	if (!__DEV__) return
	if (!value) throw new Error(message ?? 'assertion failed')
}

export const html_tag: unique symbol = Symbol()
export const is_html = (value: any): value is HTML => typeof value === 'object' && value !== null && html_tag in value

export const single_part_template = (part: Displayable): HTML => html`${part}`
