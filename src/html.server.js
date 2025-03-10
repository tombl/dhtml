/** @import {
	Cleanup,
	CompiledTemplate,
	Directive,
	Displayable,
	Key,
	Part,
	Renderable,
	Span as SpanInstance
} from './types' */

import { Tokenizer } from 'htmlparser2'

function noop() {}

/** * @param {TemplateStringsArray} statics */
function compileTemplate(statics) {
	const queue = []
	const parts = []

	function process(kind, start, end) {
		while (queue.length) {
			if (queue[0] >= start && queue[0] < end) {
				queue.shift()
				parts.push(kind)
			}
		}
	}

	const tokens = new Tokenizer(
		{},
		{
			onattribdata(start, end) {
				process('attribdata', start, end)
			},
			onattribentity: noop,
			onattribend: noop,
			onattribname(start, end) {
				process('attribname', start, end)
			},
			oncdata(start, end) {
				process('cdata', start, end)
			},
			onclosetag(start, end) {
				process('closetag', start, end)
			},
			oncomment(start, end) {
				process('comment', start, end)
			},
			ondeclaration(start, end) {
				process('declaration', start, end)
			},
			onend: noop,
			onopentagend: noop,
			onopentagname(start, end) {
				process('opentagname', start, end)
			},
			onprocessinginstruction(start, end) {
				process('processinginstruction', start, end)
			},
			onselfclosingtag: noop,
			ontext(start, end) {
				process('text', start, end)
			},
			ontextentity: noop,
		},
	)

	let offset = 0
	for (let i = 0; i < statics.length - 1; i++) {
		tokens.write(statics[i])
		offset += statics[i].length

		queue.push(offset)

		// use the same syntax as on the client, so it should parse the exact same,
		// although the number doesn't matter here
		const dyn = 'dyn-$0$'
		tokens.write(dyn)
		offset += dyn.length
	}
	tokens.write(statics[statics.length - 1])
	tokens.end()

	return { parts }
}

const compileCache = new WeakMap()

/**
 * @param {TemplateStringsArray} statics
 * @param  {unknown[]} dynamics
 */
export function html(statics, ...dynamics) {
	let compiled = compileCache.get(statics)
	if (!compiled) {
		compileCache.set(statics, (compiled = compileTemplate(statics)))
	}

	return { ...compiled, dynamics }
}

console.log(html`
  <p>${'text'}</p>
  <a href=${'attr'}></a>
  <button ${'directive'}></button>
  <${'tag'}></${'tag'}>
`)
