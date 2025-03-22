import { compileTemplate, type CompiledTemplate } from './compiler.ts'
import { assert, DEV } from './internal.ts'
import type { Displayable } from './util.ts'

interface HTML {
	$: typeof html
	_dynamics: unknown[]
	_template: CompiledTemplate
}

export const isHtml = (value: any): value is HTML => value?.$ === html

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML {
	let template: CompiledTemplate

	if (DEV) {
		assert(
			compileTemplate(statics)._parts.length === dynamics.length,
			'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
		)
	}

	return {
		$: html,
		_dynamics: dynamics,
		get _template() {
			return (template ??= compileTemplate(statics))
		},
	}
}

export const singlePartTemplate = (part: Displayable) => html`${part}`
