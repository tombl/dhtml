import { test } from 'bun:test'
import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import assert from 'node:assert/strict'

test('renderables work correctly', () => {
	assert.equal(
		renderToString(
			html`${{
				render() {
					return html`<h1>Hello, world!</h1>`
				},
			}}`,
		),
		'<h1>Hello, world!</h1>',
	)
})

test('thrown errors directly propagate', () => {
	const oops = new Error('oops')
	assert.throws(() => {
		renderToString(
			html`${{
				render() {
					throw oops
				},
			}}`,
		)
	}, oops)
})

test('renderables can throw instead of returning', () => {
	assert.equal(
		renderToString({
			render() {
				throw html`this was thrown`
			},
		}),
		'this was thrown',
	)
})
