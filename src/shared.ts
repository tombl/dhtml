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
export let unwrap_keyed: (value: Keyed) => Key

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

export class Keyed implements Renderable {
	#key: Key
	#displayable: Displayable
	constructor(displayable: Displayable, key: Key) {
		this.#key = key
		this.#displayable = displayable
	}
	render(): Displayable {
		return this.#displayable
	}
	static {
		unwrap_keyed = value => value.#key
	}
}

export function keyed(displayable: Displayable, key: Key): Keyed {
	return new Keyed(displayable, key)
}

export function is_keyed(value: unknown): value is Keyed {
	return value instanceof Keyed
}
