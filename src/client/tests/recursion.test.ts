import { test } from 'bun:test'
import { html } from 'dhtml'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

const DEPTH = 10

test('basic recursion is handled correctly', () => {
	const { root, el } = setup()

	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return this
		},
	}
	root.render(app)
	assert.equal(el.innerHTML, 'hello!')
})

test('nested recursion is handled correctly', () => {
	const { root, el } = setup()

	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return html`<span>${this}</span>`
		},
	}
	root.render(app)
	assert.equal(el.innerHTML, '<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
})
