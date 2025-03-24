import { test } from 'bun:test'
import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import assert from 'node:assert/strict'

test('renderables work correctly', async () => {
	assert.equal(
		await renderToString(
			html`${{
				render() {
					return html`<h1>Hello, world!</h1>`
				},
			}}`,
		),
		'<h1>Hello, world!</h1>',
	)
})

test('thrown errors directly propagate', async () => {
	const oops = new Error('oops')
	await assert.rejects(async () => {
		await renderToString(
			html`${{
				render() {
					throw oops
				},
			}}`,
		)
	}, oops)
})

test('renderables can throw instead of returning', async () => {
	assert.equal(
		await renderToString({
			render() {
				throw html`this was thrown`
			},
		}),
		'this was thrown',
	)
})
