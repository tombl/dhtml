/** @import { Displayable } from 'dhtml' */
/** @import { CompiledTemplate, PartRenderer } from './server/types.js' */
import { Tokenizer } from 'htmlparser2'
import { assert, is_html, is_iterable, is_renderable, single_part_template } from './shared.js'

const WHITESPACE_WHOLE = /^\s+$/
const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/gi

/** @type {WeakMap<TemplateStringsArray, CompiledTemplate>} */
const templates = new WeakMap()

/**
 * @param {TemplateStringsArray} statics
 */
function compile_template(statics) {
	const cached = templates.get(statics)
	if (cached) return cached

	const html = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}$`), '')
	/** @type {Array<{start: number, end: number, render: PartRenderer}>} */
	const parts = []
	/** @type {[number, number] | null} */
	let attribname = null
	function noop() {}

	// count of parts that don't directly correspond to inputs
	let extra_parts = 0

	const tokenizer = new Tokenizer(
		{},
		{
			onattribname(start, end) {
				const name = html.slice(start, end)
				const match = name.match(DYNAMIC_WHOLE)
				if (match) {
					const idx = parseInt(match[1])
					parts.push({ start, end, render: values => render_directive(values[idx]) })
					return
				}

				// assert(!DYNAMIC_GLOBAL.test(name), `expected a whole dynamic value for ${name}, got a partial one`)

				attribname = [start, end]
			},
			onattribdata(start, end) {
				assert(attribname)

				const [nameStart, nameEnd] = attribname
				const name = html.slice(nameStart, nameEnd)
				const value = html.slice(start, end)

				const match = value.match(DYNAMIC_WHOLE)
				if (match) {
					const idx = parseInt(match[1])
					parts.push({ start: nameStart, end, render: values => render_attribute(name, values[idx]) })
					return
				}

				// assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
			},
			onattribentity: noop,
			onattribend() {
				attribname = null
			},

			onopentagname(start, end) {},
			onopentagend() {},
			onclosetag(start, end) {},
			onselfclosingtag: noop,

			ontext(start, end) {
				const value = html.slice(start, end)

				for (const match of [...value.matchAll(DYNAMIC_GLOBAL)]) {
					const idx = parseInt(match[1])
					parts.push({
						start: start + match.index,
						end: start + match.index + match[0].length,
						render: values => render_child(values[idx]),
					})
				}

				if (WHITESPACE_WHOLE.test(value)) {
					extra_parts++
					parts.push({ start, end, render: () => ' ' })
					return
				}
			},
			ontextentity: noop,

			oncomment(start, end) {
				const value = html.slice(start, end)

				for (const match of [...value.matchAll(DYNAMIC_GLOBAL)]) {
					const idx = parseInt(match[1])
					parts.push({
						start: start + match.index,
						end: start + match.index + match[0].length,
						render: values => escape(values[idx]),
					})
				}
			},

			oncdata(start, end) {},
			ondeclaration(start, end) {},
			onprocessinginstruction(start, end) {},

			onend: noop,
		},
	)

	tokenizer.write(html)
	tokenizer.end()

	/** @type {CompiledTemplate} */
	const compiled = {
		statics: [],
		parts: [],
		extra_parts,
	}

	compiled.statics.push(html.slice(0, parts[0]?.start))

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		const next_part = parts[i + 1]
		compiled.parts.push(part.render)
		compiled.statics.push(html.slice(part.end, next_part?.start))
	}

	templates.set(statics, compiled)
	return compiled
}

/**
 * @param {unknown} value
 */
function render_directive(value) {
	if (value === null) return ''

	assert(typeof value === 'function')
	console.log('directive returned:', value())

	return ''
}

/**
 * @param {string} name
 * @param {unknown} value
 */
function render_attribute(name, value) {
	if (value === false || value === null || typeof value === 'function') {
		return ''
	}
	if (value === true) return name
	return `${name}="${escape(value)}"`
}

/**
 * @param {unknown} value
 */
function* render_child(value) {
	/** @type {Map<object, number>} */
	const seen = new Map()

	while (is_renderable(value))
		try {
			const times = seen.get(value) ?? 0
			if (times > 100) throw new Error('circular render')
			seen.set(value, times + 1)

			value = value.render()
		} catch (thrown) {
			if (is_html(thrown)) {
				value = thrown
			} else {
				throw thrown
			}
		}

	if (is_iterable(value)) {
		for (const item of value) yield* render_to_iterable(/** @type {Displayable} */ (item))
	} else if (is_html(value)) {
		yield* render_to_iterable(value)
	} else if (value !== null) {
		yield escape(value)
	}
}

const ESCAPE_RE = /[&<>"']/g
const ESCAPE_SUBSTITUTIONS = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}

/**
 * @param {unknown} str
 */
function escape(str) {
	return String(str).replace(ESCAPE_RE, c => ESCAPE_SUBSTITUTIONS[/** @type {keyof typeof ESCAPE_SUBSTITUTIONS} */ (c)])
}

/**
 * @param {Displayable} value
 */
function* render_to_iterable(value) {
	const { _statics: statics, _dynamics: dynamics } = is_html(value) ? value : single_part_template(value)
	const template = compile_template(statics)

	assert(
		template.parts.length - template.extra_parts === dynamics.length,
		'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
	)

	for (let i = 0; i < template.statics.length - 1; i++) {
		yield template.statics[i]
		yield* template.parts[i](dynamics)
	}
	yield template.statics[template.statics.length - 1]
}

/**
 * @param {Displayable} value
 */
export function renderToString(value) {
	let str = ''
	for (const part of render_to_iterable(value)) str += part
	return str
}

/**
 * @param {Displayable} value
 */
export function renderToReadableStream(value) {
	const iter = render_to_iterable(value)[Symbol.iterator]()
	return new ReadableStream({
		pull(controller) {
			const { done, value } = iter.next()
			if (done) {
				controller.close()
				return
			}
			controller.enqueue(value)
		},
	})
}
