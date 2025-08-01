import { html_tag, is_html, keyed_tag, type Displayable, type Key, type Keyed } from './shared.ts'

export interface HTML {
	[html_tag]: true
	/* @internal */ _statics: TemplateStringsArray
	/* @internal */ _dynamics: unknown[]
}

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML {
	return {
		[html_tag]: true,
		_dynamics: dynamics,
		_statics: statics,
	}
}

export function keyed<T extends Displayable & object>(displayable: T, key: Key): Keyed {
	return {
		[keyed_tag]: true,
		_key: key,
		render: () => displayable,
	}
}

if (__DEV__) {
	type JsonML = string | readonly [tag: string, attrs?: Record<string, any>, ...children: JsonML[]]
	interface Formatter {
		header(value: unknown): JsonML | null
		hasBody(value: unknown): boolean
		body?(value: unknown): JsonML | null
	}

	;((globalThis as { devtoolsFormatters?: Formatter[] }).devtoolsFormatters ??= []).push({
		header(value) {
			if (!is_html(value)) return null

			const children: JsonML[] = []
			for (let i = 0; i < value._dynamics.length; i++)
				children.push(value._statics[i], ['object', { object: value._dynamics[i] }])
			children.push(value._statics[value._statics.length - 1])

			return ['span', {}, 'html`', ...children, '`']
		},
		hasBody() {
			return false
		},
	})
}

export type { Displayable, Renderable } from './shared.ts'
