import { test } from 'bun:test'
import { html } from 'dhtml'
import assert from 'node:assert/strict'

type JsonML = string | readonly [tag: string, attrs?: Record<string, any>, ...children: JsonML[]]
interface Formatter {
	header(value: unknown): JsonML | null
	hasBody(value: unknown): boolean
	body?(value: unknown): JsonML | null
}

const { devtoolsFormatters = [] } = globalThis as { devtoolsFormatters?: Formatter[] }

function stringify(markup: JsonML): string {
	if (typeof markup === 'string') return markup
	const [tag, attrs, ...children] = markup

	if (tag === 'object') return format(attrs!.object)

	let str = `<${tag}`
	if (attrs) for (const [k, v] of Object.entries(attrs)) str += ` ${k}="${v}"`
	str += '>'
	for (const child of children) str += stringify(child)
	str += `</${tag}>`
	return str
}

function format(value: unknown): string {
	for (const formatter of devtoolsFormatters) {
		const header = formatter.header(value)
		if (header === null) continue

		let str = stringify(header)
		if (formatter.hasBody(value)) {
			str += '\n\n' + stringify(formatter.body!(value)!)
		}
		return str
	}
	return JSON.stringify(value)
}

const dev_test = test.skipIf(!__DEV__)
dev_test('devtools formatter', () => {
	assert.equal(format(html`<p>Count is ${1}</p>`), '<span>html`<p>Count is 1</p>`</span>')
})
