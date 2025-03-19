import type { HTML } from './index.ts'
import {
	assert,
	is_html,
	is_iterable,
	is_renderable,
	lexer,
	single_part_template,
	type Displayable,
	type Renderable,
} from './shared.ts'

interface PartRenderer {
	replace_start: number
	replace_end: number
	render: (values: unknown[], controller: Controller) => string | Generator<string, void, void>
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
						render: (values, controller) => render_child(values[i], controller),
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

	let str = template.source
	let prev_end = 0
	for (const { replace_start, replace_end, render } of template.parts) {
		yield str.slice(prev_end, replace_start)
		yield* render(dynamics, controller)
		prev_end = replace_end
	}
	yield str.slice(prev_end)
}

async function* read_all_promises<T>(promises: Promise<T>[]): AsyncGenerator<T> {
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
	const render_controller: Controller = { injections: [] }
	let str = ''

	for (const part of render_to_iterable(value, render_controller)) {
		str += part
	}

	const count = render_controller.injections.length
	for await (const injection of read_all_promises(render_controller.injections)) {
		for (const part of render_to_iterable(injection, render_controller)) {
			str += part
		}
	}
	assert(
		count === render_controller.injections.length,
		'calling injectToStream from an injection is currently not supported',
	)

	return str
}

export function renderToReadableStream(value: Displayable): ReadableStream<Uint8Array> {
	const render_controller: Controller = { injections: [] }
	const iter = render_to_iterable(value, render_controller)

	return new ReadableStream<string>({
		async pull(controller) {
			const { done, value } = iter.next()

			if (done) {
				const count = render_controller.injections.length
				for await (const injection of read_all_promises(render_controller.injections)) {
					for (const part of render_to_iterable(injection, render_controller)) {
						controller.enqueue(part)
					}
				}
				assert(
					count === render_controller.injections.length,
					'calling injectToStream from an injection is currently not supported',
				)
				controller.close()
				return
			}

			controller.enqueue(value)
		},
	}).pipeThrough(new TextEncoderStream())
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
