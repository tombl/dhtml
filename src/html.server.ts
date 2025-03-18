import type { Displayable, Renderable } from './types.ts'
import { Tokenizer } from 'htmlparser2'

function isRenderable(value: unknown): value is Renderable {
	return typeof value === 'object' && value !== null && 'render' in value
}

function isIterable(value: unknown): value is Iterable<unknown> {
	return typeof value === 'object' && value !== null && Symbol.iterator in value
}

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]) {
	return new BoundTemplateInstance(statics, dynamics)
}

const singlePartTemplate = (part: Displayable) => html`${part}`

/* v8 ignore start */
function assert(value: unknown, message = 'assertion failed'): asserts value {
	if (!value) throw new Error(message)
}
/* v8 ignore stop */

type PartRenderer = (values: unknown[]) => string | Generator<string, void, void>

interface CompiledTemplate {
	statics: string[]
	parts: PartRenderer[]
}

class BoundTemplateInstance {
	#template: CompiledTemplate | undefined
	#statics: TemplateStringsArray
	dynamics: unknown[]

	get template() {
		return (this.#template ??= compileTemplate(this.#statics))
	}

	constructor(statics: TemplateStringsArray, dynamics: unknown[]) {
		this.#statics = statics
		this.dynamics = dynamics
	}
}

const WHITESPACE_WHOLE = /^\s+$/
const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/gi

const templates = new WeakMap<TemplateStringsArray, CompiledTemplate>()
function compileTemplate(statics: TemplateStringsArray): CompiledTemplate {
	const cached = templates.get(statics)
	if (cached) return cached

	const html = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}$`), '')
	const parts: {
		start: number
		end: number
		render: PartRenderer
	}[] = []
	let attribname: [start: number, end: number] | null = null
	function noop() {}

	const tokenizer = new Tokenizer(
		{},
		{
			onattribname(start, end) {
				const name = html.slice(start, end)
				const match = name.match(DYNAMIC_WHOLE)
				if (match) {
					const idx = parseInt(match[1])
					parts.push({
						start,
						end,
						render: values => {
							const value = values[idx]
							if (value === null) return ''

							assert(typeof value === 'function')
							console.log('directive returned:', value())

							return ''
						},
					})
					return
				}

				assert(!DYNAMIC_GLOBAL.test(name), `expected a whole dynamic value for ${name}, got a partial one`)

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
					parts.push({
						start: nameStart,
						end,
						render: values => {
							let value = values[idx]
							if (value === false || value === null || typeof value === 'function') {
								return ''
							}
							if (value === true) value = ''
							return `${name}="${escape(value)}"`
						},
					})
					return
				}

				assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
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
						*render(values) {
							let value = values[idx]

							const seen = new Set()
							while (isRenderable(value))
								try {
									if (seen.has(value)) throw new Error('circular render')
									seen.add(value)
									value = value.render()
								} catch (thrown) {
									if (thrown instanceof BoundTemplateInstance) {
										value = thrown
									} else {
										throw thrown
									}
								}

							if (isIterable(value)) {
								for (const item of value) yield* renderToIterable(item as Displayable)
							} else if (value instanceof BoundTemplateInstance) {
								yield* renderToIterable(value)
							} else if (value !== null) {
								yield escape(value)
							}
						},
					})
				}

				if (WHITESPACE_WHOLE.test(value)) {
					parts.push({
						start,
						end,
						render: () => ' ',
					})
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

	const compiled: CompiledTemplate = {
		statics: [],
		parts: [],
	}

	compiled.statics.push(html.slice(0, parts[0]?.start))

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		const nextPart = parts[i + 1]
		compiled.parts.push(part.render)
		compiled.statics.push(html.slice(part.end, nextPart?.start))
	}

	templates.set(statics, compiled)
	return compiled
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
	return String(str).replace(ESCAPE_RE, c => ESCAPE_SUBSTITUTIONS[c])
}

function* renderToIterable(value: Displayable) {
	const { template, dynamics } = value instanceof BoundTemplateInstance ? value : singlePartTemplate(value)

	for (let i = 0; i < template.statics.length - 1; i++) {
		yield template.statics[i]
		yield* template.parts[i](dynamics)
	}
	yield template.statics[template.statics.length - 1]
}

export function renderToString(value: Displayable) {
	let str = ''
	for (const part of renderToIterable(value)) str += part
	return str
}

export function renderToReadableStream(value: Displayable) {
	const iter = renderToIterable(value)[Symbol.iterator]()
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

{
	const displayable = html`
		<!-- ${'z'} -->
		<p>a${'text'}b</p>
		<a href=${'attr'} onclick=${() => {}}></a>
		<button ${() => 'directive'}>but</button>
		<script>
			;<span>z</span>
		</script>
		${{
			render() {
				return html`<div>${[1, 2, 3]}</div>`
			},
		}}
		${html`[${'A'}|${'B'}]`}
	`

	const stream = renderToReadableStream(displayable).pipeThrough(new TextEncoderStream())

	new Response(stream).text().then(rendered => {
		console.log(rendered)
		console.log(rendered === renderToString(displayable))
	})
}
