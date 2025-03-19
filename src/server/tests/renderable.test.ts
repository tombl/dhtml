import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import { assert, assert_eq, test } from '../../../scripts/test/test.ts'

test('renderables work correctly', async () => {
	assert_eq(
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
	try {
		await renderToString(
			html`${{
				render() {
					throw oops
				},
			}}`,
		)
		assert(false, 'Expected an error')
	} catch {}
})

test('renderables can throw instead of returning', async () => {
	assert_eq(
		await renderToString({
			render() {
				throw html`this was thrown`
			},
		}),
		'this was thrown',
	)
})
