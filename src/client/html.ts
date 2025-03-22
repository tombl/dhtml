import type { Displayable } from '../shared.ts'
import { compile_template, type CompiledTemplate } from './compiler.ts'
import { assert, DEV } from './internal.ts'

const tag = Symbol()

interface HTML {
	[tag]: true
	/* @internal */ _dynamics: unknown[]
	/* @internal */ _template: CompiledTemplate
}

export const is_html = (value: any): value is HTML => typeof value === 'object' && value !== null && tag in value

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML {
	let template: CompiledTemplate

	if (DEV) {
		assert(
			compile_template(statics)._parts.length === dynamics.length,
			'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
		)
	}

	return {
		[tag]: true,
		_dynamics: dynamics,
		get _template() {
			return (template ??= compile_template(statics))
		},
	}
}

export const single_part_template = (part: Displayable) => html`${part}`
