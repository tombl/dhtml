import {
	ATTR_NAME,
	ATTR_VALUE_DOUBLE_QUOTED,
	ATTR_VALUE_SINGLE_QUOTED,
	ATTR_VALUE_UNQUOTED,
	COMMENT,
	COMMENT2,
	DATA,
	assert,
	is_html,
	is_iterable,
	is_renderable,
	lex,
	single_part_template,
} from './shared.js'

//#region src/server.ts
const WHITESPACE = /\s/
const templates = /* @__PURE__ */ new WeakMap()
function compile_template(statics) {
	const cached = templates.get(statics)
	if (cached) return cached
	const compiled = {
		source: statics.join('\0'),
		parts: [],
		extra_parts: 0,
	}
	let offset = 0
	let dyn_i = 0
	let whitespace_count = 0
	let prev_state
	let attr_name = ''
	let attr_start
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
	for (const [char, state] of lex(statics)) {
		if (state === ATTR_NAME) {
			if (prev_state !== ATTR_NAME) {
				attr_name = ''
				attr_start = offset
			}
			attr_name += char
		}
		if (state === DATA && WHITESPACE.test(char)) whitespace_count++
		else collapse_whitespace()
		if (char === '\0') {
			const i = dyn_i++
			switch (state) {
				case DATA:
				case COMMENT:
				case COMMENT2:
					compiled.parts.push({
						replace_start: offset,
						replace_end: offset + 1,
						render: values => render_child(values[i]),
					})
					break
				case ATTR_VALUE_UNQUOTED:
				case ATTR_VALUE_DOUBLE_QUOTED:
				case ATTR_VALUE_SINGLE_QUOTED:
					const name = attr_name
					assert(attr_start !== void 0)
					compiled.parts.push({
						replace_start: attr_start,
						replace_end: offset + 1 + (state === ATTR_VALUE_UNQUOTED ? 0 : 1),
						render: values => render_attribute(name, values[i]),
					})
					break
				case ATTR_NAME:
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
	{
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
function render_directive(value) {
	if (value === null) return ''
	assert(typeof value === 'function')
	return ''
}
function render_attribute(name, value) {
	if (value === false || value === null || typeof value === 'function') return ''
	if (value === true) return name
	return `${name}="${escape(value)}"`
}
function* render_child(value) {
	yield '<?[>'
	if (is_renderable(value)) {
		try {
			value = value.render()
		} catch (thrown) {
			if (is_html(thrown)) value = thrown
			else throw thrown
		}
		if (is_renderable(value)) value = single_part_template(value)
	}
	if (is_iterable(value)) for (const item of value) yield* render_child(item)
	else if (is_html(value)) {
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
	} else if (value !== null) yield escape(value)
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
function escape(str) {
	return String(str).replace(ESCAPE_RE, c => ESCAPE_SUBSTITUTIONS[c])
}
function renderToString(value) {
	let str = ''
	for (const part of render_child(value)) str += part
	return str
}
function renderToReadableStream(value) {
	const iter = render_child(value)
	return new ReadableStream({
		pull(controller) {
			const { done, value: value$1 } = iter.next()
			if (done) {
				controller.close()
				return
			}
			controller.enqueue(value$1)
		},
	}).pipeThrough(new TextEncoderStream())
}

//#endregion
export { renderToReadableStream, renderToString }
//# sourceMappingURL=server.js.map
