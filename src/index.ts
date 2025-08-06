export { html, keyed, type Displayable, type HTML, type Renderable } from './shared.ts'

import { is_html, unwrap_html } from './shared.ts'

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
			const { _statics: statics, _dynamics: dynamics } = unwrap_html(value)

			const children: JsonML[] = []
			for (let i = 0; i < dynamics.length; i++) children.push(statics[i], ['object', { object: dynamics[i] }])
			children.push(statics[statics.length - 1])

			return ['span', {}, 'html`', ...children, '`']
		},
		hasBody() {
			return false
		},
	})
}
