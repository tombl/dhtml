import {
	assert,
	is_html,
	is_iterable,
	is_renderable,
	lexer,
	single_part_template,
	unwrap_renderable,
	type Displayable,
} from './shared.ts'

interface PartRenderer {
	replace_start: number
	replace_end: number
	render: (values: unknown[]) => string | Generator<string, void, void>
}

interface CompiledTemplate {
	source: string
	parts: PartRenderer[]
	extra_parts: number
}

const WHITESPACE = /\s/

const templates = new WeakMap<TemplateStringsArray, CompiledTemplate>()
function compile_template(statics: TemplateStringsArray): CompiledTemplate {
	const cached = templates.get(statics)
	if (cached) return cached

	const compiled: CompiledTemplate = {
		source: statics.join('\0'),
		parts: [],
		extra_parts: 0,
	}
	let offset = 0
	let dyn_i = 0

	let whitespace_count = 0
	let prev_state: lexer.State | undefined
	let attr_name: string = ''
	let attr_start: number | undefined

	function collapse_whitespace() {
		if (whitespace_count > 1) {
			compiled.extra_parts++
			compiled.parts.push({
				replace_start: offset - whitespace_count,
				replace_end: offset,
				render: () => ' ',
			})
		}
		whitespace_count = 0
	}

	for (const [char, state] of lexer.lex(statics)) {
		if (state === lexer.ATTR_NAME) {
			if (prev_state !== lexer.ATTR_NAME) {
				attr_name = ''
				attr_start = offset
			}
			attr_name += char
		}

		if (state === lexer.DATA && WHITESPACE.test(char)) {
			whitespace_count++
		} else {
			collapse_whitespace()
		}

		if (char === '\0') {
			const i = dyn_i++

			switch (state) {
				case lexer.DATA:
				case lexer.COMMENT:
				case lexer.COMMENT2:
					compiled.parts.push({
						replace_start: offset,
						replace_end: offset + 1,
						render: values => render_child(values[i]),
					})
					break

				case lexer.ATTR_VALUE_UNQUOTED:
				case lexer.ATTR_VALUE_DOUBLE_QUOTED:
				case lexer.ATTR_VALUE_SINGLE_QUOTED:
					const name = attr_name
					assert(attr_start !== undefined)
					compiled.parts.push({
						replace_start: attr_start,
						replace_end: offset + 1 + (state === lexer.ATTR_VALUE_UNQUOTED ? 0 : 1),
						render: values => render_attribute(name, values[i]),
					})
					break

				case lexer.ATTR_NAME:
					compiled.parts.push({
						replace_start: offset,
						replace_end: offset + 1,
						render: values => render_directive(values[i]),
					})
					break

				default:
					assert(false, `unexpected state ${state}`)
			}
		}

		prev_state = state
		offset++
	}
	collapse_whitespace()

	if (__DEV__) {
		let prev_end = -1
		for (const { replace_start, replace_end } of compiled.parts) {
			assert(replace_start >= prev_end)
			assert(replace_start < replace_end)
			prev_end = replace_end
		}
	}

	templates.set(statics, compiled)
	return compiled
}

function render_directive(value: unknown) {
	if (value === null) return ''

	assert(typeof value === 'function')
	// console.log('directive returned:', value())

	return ''
}

function render_attribute(name: string, value: unknown) {
	if (value === false || value === null || typeof value === 'function') {
		return ''
	}
	if (value === true) return name
	return `${name}="${escape(value)}"`
}

function* render_child(value: unknown): Generator<string, void, void> {
	yield '<?[>'

	if (is_renderable(value)) {
		value = unwrap_renderable(value)
		if (is_renderable(value)) value = single_part_template(value)
	}

	if (is_iterable(value)) {
		for (const item of value) yield* render_child(item)
	} else if (is_html(value)) {
		const { _statics: statics, _dynamics: dynamics } = value
		const template = compile_template(statics)

		assert(
			template.parts.length - template.extra_parts === dynamics.length,
			'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
		)

		let prev_end = 0
		for (const { replace_start, replace_end, render } of template.parts) {
			yield template.source.slice(prev_end, replace_start)
			yield* render(dynamics)
			prev_end = replace_end
		}
		yield template.source.slice(prev_end)
	} else if (value !== null) {
		yield escape(value)
	}

	yield '<?]>'
}

const ESCAPE_RE = /[&<>"']/g
const ESCAPE_SUBSTITUTIONS = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}
function escape(str: unknown) {
	return String(str).replace(ESCAPE_RE, c => ESCAPE_SUBSTITUTIONS[c as keyof typeof ESCAPE_SUBSTITUTIONS])
}

export function renderToString(value: Displayable): string {
	let str = ''
	for (const part of render_child(value)) str += part
	return str
}

export function renderToReadableStream(value: Displayable): ReadableStream<Uint8Array> {
	const iter = render_child(value)
	return new ReadableStream<string>({
		pull(controller) {
			const { done, value } = iter.next()
			if (done) {
				controller.close()
				return
			}
			controller.enqueue(value)
		},
	}).pipeThrough(new TextEncoderStream())
}
