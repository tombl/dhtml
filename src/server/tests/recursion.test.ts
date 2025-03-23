import { test } from 'bun:test'
import { html } from 'dhtml'
import assert from 'node:assert/strict'
import { renderToString } from '../../server.ts'

const DEPTH = 10

test('basic recursion is handled correctly', () => {
	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return this
		},
	}
	assert.equal(renderToString(app), 'hello!')
})

test('nested recursion is handled correctly', () => {
	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return html`<span>${this}</span>`
		},
	}
	assert.equal(renderToString(app), '<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
})
