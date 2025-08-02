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
	return typeof value === 'object' && value !== null && 'render' in value
}

let current_renderable: Renderable | undefined

export function unwrap_renderable(renderable: Renderable): Displayable {
	const prev = current_renderable
	current_renderable = renderable

	try {
		return renderable.render()
	} catch (thrown) {
		if (is_html(thrown)) {
			return thrown
		} else {
			throw thrown
		}
	} finally {
		current_renderable = prev
	}
}

export function getCurrentRenderable(): Renderable | undefined {
	return current_renderable
}

export function is_iterable(value: unknown): value is Iterable<unknown> {
	return typeof value === 'object' && value !== null && Symbol.iterator in value
}

export function assert(value: unknown, message?: string): asserts value {
	if (!__DEV__) return
	if (!value) {
		const error = new Error(message ?? 'assertion failed')
		Error.captureStackTrace?.(error, assert) // remove assert from the stack trace
		throw error
	}
}

export interface HTML {
	[html_tag]: true
	/* @internal */ _statics: TemplateStringsArray
	/* @internal */ _dynamics: unknown[]
}

const html_tag: unique symbol = Symbol()
export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML {
	return {
		[html_tag]: true,
		_dynamics: dynamics,
		_statics: statics,
	}
}

export function is_html(value: unknown): value is HTML {
	return typeof value === 'object' && value !== null && html_tag in value
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
export function keyed<T extends Displayable & object>(displayable: T, key: Key): Keyed {
	return {
		[keyed_tag]: true,
		_key: key,
		render: () => displayable,
	}
}

export function is_keyed(value: any): value is Keyed {
	return typeof value === 'object' && value !== null && keyed_tag in value
}
