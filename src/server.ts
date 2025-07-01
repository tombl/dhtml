import { Tokenizer } from 'htmlparser2'
import type { HTML } from './index.ts'
import {
	assert,
	is_html,
	is_iterable,
	is_renderable,
	single_part_template,
	type Displayable,
	type Renderable,
} from './shared.ts'

type PartRenderer = (values: unknown[], controller: Controller) => string | Generator<string, void, void>

interface CompiledTemplate {
	statics: string[]
	parts: PartRenderer[]
	extra_parts: number
}

const WHITESPACE_WHOLE = /^\s+$/
const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/gi

const templates = new WeakMap<TemplateStringsArray, CompiledTemplate>()
function compile_template(statics: TemplateStringsArray): CompiledTemplate {
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

				for (const match of value.matchAll(DYNAMIC_GLOBAL)) {
					const idx = parseInt(match[1])
					parts.push({
						start: start + match.index,
						end: start + match.index + match[0].length,
						render: (values, controller) => render_child(values[idx], controller),
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

				for (const match of value.matchAll(DYNAMIC_GLOBAL)) {
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

interface Controller {
	injections: Promise<HTML>[]
}

const controllers = new WeakMap<Renderable, Controller>()

export function injectToStream(renderable: Renderable, markup: HTML | Promise<HTML>): void {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	controller.injections.push(Promise.resolve(markup))
}

function render_directive(value: unknown) {
	if (value === null) return ''

	assert(typeof value === 'function')
	console.log('directive returned:', value())

	return ''
}

function render_attribute(name: string, value: unknown) {
	if (value === false || value === null || typeof value === 'function') {
		return ''
	}
	if (value === true) return name
	return `${name}="${escape(value)}"`
}

function* render_child(value: unknown, controller: Controller) {
	const seen = new WeakMap<object, number>()

	while (is_renderable(value))
		try {
			const renderable = value

			const times = seen.get(renderable) ?? 0
			if (times > 100) throw new Error('circular render')
			seen.set(renderable, times + 1)

			controllers.set(renderable, controller)
			value = renderable.render()
		} catch (thrown) {
			if (is_html(thrown)) {
				value = thrown
			} else {
				throw thrown
			}
		}

	if (is_iterable(value)) {
		for (const item of value) yield* render_to_iterable(item as Displayable, controller)
	} else if (is_html(value)) {
		yield* render_to_iterable(value, controller)
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
function escape(str: unknown) {
	return String(str).replace(ESCAPE_RE, c => ESCAPE_SUBSTITUTIONS[c as keyof typeof ESCAPE_SUBSTITUTIONS])
}

function* render_to_iterable(value: Displayable, controller: Controller) {
	const { _statics: statics, _dynamics: dynamics } = is_html(value) ? value : single_part_template(value)
	const template = compile_template(statics)

	assert(
		template.parts.length - template.extra_parts === dynamics.length,
		'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
	)

	for (let i = 0; i < template.statics.length - 1; i++) {
		yield template.statics[i]
		yield* template.parts[i](dynamics, controller)
	}
	yield template.statics[template.statics.length - 1]
}

async function* readAllPromises<T>(promises: Promise<T>[]): AsyncGenerator<T> {
	type RecursivePromise<T> = Promise<{
		value: T
		promise: RecursivePromise<T>
	}>

	const pending = new Set(
		promises.map(p => {
			const promise: RecursivePromise<T> = p.then(value => ({ value, promise }))
			return promise
		}),
	)

	while (pending.size) {
		const { value, promise } = await Promise.race(pending)
		pending.delete(promise)
		yield value
	}
}

export async function renderToString(value: Displayable): Promise<string> {
	const renderController: Controller = { injections: [] }
	let str = ''

	for (const part of render_to_iterable(value, renderController)) {
		str += part
	}

	const count = renderController.injections.length
	for await (const injection of readAllPromises(renderController.injections)) {
		for (const part of render_to_iterable(injection, renderController)) {
			str += part
		}
	}
	assert(
		count === renderController.injections.length,
		'calling injectToStream from an injection is currently not supported',
	)

	return str
}

export function renderToReadableStream(value: Displayable): ReadableStream<string> {
	const renderController: Controller = { injections: [] }
	const iter = render_to_iterable(value, renderController)[Symbol.iterator]()

	return new ReadableStream<string>({
		async pull(controller) {
			const { done, value } = iter.next()

			if (done) {
				const count = renderController.injections.length
				for await (const injection of readAllPromises(renderController.injections)) {
					for (const part of render_to_iterable(injection, renderController)) {
						controller.enqueue(part)
					}
				}
				assert(
					count === renderController.injections.length,
					'calling injectToStream from an injection is currently not supported',
				)
				controller.close()
				return
			}

			controller.enqueue(value)
		},
	})
}

// {
// 	const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 	const suspends = {
// 		render() {
// 			const id = 'abcd'
// 			injectToStream(
// 				this,
// 				sleep(250).then(
// 					() =>
// 						html`<script>
// 							document.getElementById('${id}').replaceWith('${'the value'}')
// 						</script>`,
// 				),
// 			)
// 			throw html`<span id=${id}></span>`
// 		},
// 	}

// 	const displayable = html`
// 		<!doctype html>
// 		<p>a${'text'.repeat(1000)}b</p>
// 		<!-- ${'z'} -->
// 		<div>this suspends: ${suspends}</div>
// 		<a href=${'attr'} onclick=${() => {}}></a>
// 		<button ${() => 'directive'}>but</button>
// 		<script>
// 			;<span>z</span>
// 		</script>
// 		${{
// 			render() {
// 				return html`<div>${[1, 2, 3]}</div>`
// 			},
// 		}}
// 		${html`[${'A'}|${'B'}]`}
// 	`

// 	globalThis.Deno?.serve(() => {
// 		return new Response(renderToReadableStream(displayable).pipeThrough(new TextEncoderStream()), {
// 			headers: { 'content-type': 'text/html' },
// 		})
// 	})

// 	const stream = renderToReadableStream(displayable).pipeThrough(new TextEncoderStream())

// 	new Response(stream).text().then(async rendered => {
// 		console.log(rendered)
// 		console.log(rendered === (await renderToString(displayable)))
// 	})
// }
