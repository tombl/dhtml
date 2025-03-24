import { html, type Displayable, type HTML, type Renderable } from 'dhtml'

declare global {
	var __DEV__: boolean
}

export function is_renderable(value: unknown): value is Renderable {
	return typeof value === 'object' && value !== null && 'render' in value
}

export function is_iterable(value: unknown): value is Iterable<unknown> {
	return typeof value === 'object' && value !== null && Symbol.iterator in value
}

export function assert(value: unknown, message?: string): asserts value {
	if (!__DEV__) return
	if (!value) throw new Error(message ?? 'assertion failed')
}

export const html_tag: unique symbol = Symbol()
export function is_html(value: any): value is HTML {
	return typeof value === 'object' && value !== null && html_tag in value
}

export function single_part_template(part: Displayable): HTML {
	return html`${part}`
}

export interface ToString {
	toString(): string
}
