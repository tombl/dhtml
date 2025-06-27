import { html_tag, is_html } from './shared.ts'

interface ToString {
	toString(): string
}

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable> | HTML
export interface Renderable {
	render(): Displayable
}

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
			children.push(value._statics.at(-1)!)

			return ['span', {}, 'html`', ...children, '`']
		},
		hasBody() {
			return true
		},
	})
}
