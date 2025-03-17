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

interface CompiledTemplate {
	html: string
	parts: [start: number, end: number, part: (values: unknown[]) => string][]
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

	let nextPart = 0
	const compiled: CompiledTemplate = {
		html: statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}$`), ''),
		parts: [],
	}
	let attribname: [start: number, end: number] | null = null
	function noop() {}

	const tokenizer = new Tokenizer(
		{},
		{
			onattribname(start, end) {
				const name = compiled.html.slice(start, end)
				const match = name.match(DYNAMIC_WHOLE)
				if (match) {
					const idx = parseInt(match[1])
					compiled.parts.push([
						start,
						end,
						values => {
							const value = values[idx]
							if (value === null) return ''

							assert(typeof value === 'function')
							console.log('directive returned:', value())

							return ''
						},
					])
					return
				}

				assert(!DYNAMIC_GLOBAL.test(name), `expected a whole dynamic value for ${name}, got a partial one`)

				attribname = [start, end]
			},
			onattribdata(start, end) {
				assert(attribname)

				const [nameStart, nameEnd] = attribname
				const name = compiled.html.slice(nameStart, nameEnd)
				const value = compiled.html.slice(start, end)

				const match = value.match(DYNAMIC_WHOLE)
				if (match) {
					const idx = parseInt(match[1])
					compiled.parts.push([
						nameStart,
						end,
						values => {
							let value = values[idx]
							if (value === false || value === null || typeof value === 'function') {
								return ''
							}
							if (value === true) value = ''
							return `${name}="${escape(value)}"`
						},
					])
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
				const value = compiled.html.slice(start, end)

				for (const match of [...value.matchAll(DYNAMIC_GLOBAL)].reverse()) {
					const idx = parseInt(match[1])
					compiled.parts.push([
						start + match.index,
						start + match.index + match[0].length,
						values => escape(values[idx]),
					])
				}

				if (WHITESPACE_WHOLE.test(value)) {
					compiled.parts.push([start, end, () => ' '])
					return
				}
			},
			ontextentity: noop,

			oncomment(start, end) {
				const value = compiled.html.slice(start, end)

				for (const match of [...value.matchAll(DYNAMIC_GLOBAL)].reverse()) {
					const idx = parseInt(match[1])
					compiled.parts.push([
						start + match.index,
						start + match.index + match[0].length,
						values => escape(values[idx]),
					])
				}
			},

			oncdata(start, end) {},
			ondeclaration(start, end) {},
			onprocessinginstruction(start, end) {},

			onend: noop,
		},
	)

	tokenizer.write(compiled.html)
	tokenizer.end()

	compiled.parts.reverse()

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

function renderToString(value: Displayable) {
	const { template, dynamics } = value instanceof BoundTemplateInstance ? value : singlePartTemplate(value)
	let str = template.html

	for (const [start, end, part] of template.parts) {
		str = str.slice(0, start) + part(dynamics) + str.slice(end)
	}

	return str
}

console.log(
	renderToString(html`
		<!-- ${'z'} -->
		<p>a${'text'}b</p>
		<a href=${'attr'} onclick=${() => {}}></a>
		<button ${() => 'directive'}>but</button>
		<script>
			;<span>z</span>
		</script>
	`),
)
