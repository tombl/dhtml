export * as lexer from './shared/lexer.ts'

/** @internal */
declare global {
	var __DEV__: boolean
}

export interface ToString {
	toString(): string
}

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable> | HTML | Keyed
export interface Renderable {
	render(): Displayable
}

export function is_renderable(value: unknown): value is Renderable {
	return (typeof value === 'object' || typeof value === 'function') && value !== null && 'render' in value
}

export function is_iterable(value: unknown): value is Iterable<unknown> {
	return (typeof value === 'object' || typeof value === 'function') && value !== null && Symbol.iterator in value
}

export function assert(value: unknown, message?: string): asserts value {
	if (!__DEV__) return
	if (!value) {
		const error = new Error(message ?? 'assertion failed')
		Error.captureStackTrace?.(error, assert) // remove assert from the stack trace
		throw error
	}
}

export let unwrap_html: (value: HTML) => { _statics: TemplateStringsArray; _dynamics: unknown[] }

export class HTML {
	#statics: TemplateStringsArray
	#dynamics: unknown[]
	constructor(statics: TemplateStringsArray, dynamics: unknown[]) {
		this.#statics = statics
		this.#dynamics = dynamics
	}
	static {
		unwrap_html = value => ({ _statics: value.#statics, _dynamics: value.#dynamics })
	}
}

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML {
	return new HTML(statics, dynamics)
}

export function is_html(value: unknown): value is HTML {
	return value instanceof HTML
}

export function single_part_template(part: Displayable): HTML {
	return html`${part}`
}

export type Key = string | number | bigint | boolean | symbol | object | null
export interface Keyed extends Renderable {
	[keyed_tag]: true
	/** @internal */ _key: Key
}

const keyed_tag: unique symbol = Symbol()
export function keyed(displayable: Displayable, key: Key): Keyed {
	return {
		[keyed_tag]: true,
		_key: key,
		render: () => displayable,
	}
}

export function is_keyed(value: any): value is Keyed {
	return typeof value === 'object' && value !== null && keyed_tag in value
}
