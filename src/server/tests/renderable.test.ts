import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import { assert, assert_eq, test } from '../../../scripts/test/test.ts'

test('renderables work correctly', () => {
	assert_eq(
		renderToString(
			html`${{
				render() {
					return html`<h1>Hello, world!</h1>`
				},
			}}`,
		),
		'<?[><?[><h1>Hello, world!</h1><?]><?]>',
	)
})

test('thrown errors directly propagate', () => {
	const oops = new Error('oops')
	try {
		renderToString(
			html`${{
				render() {
					throw oops
				},
			}}`,
		)
		assert(false, 'Expected an error')
	} catch {}
})

test('renderables can throw instead of returning', () => {
	assert_eq(
		renderToString({
			render() {
				throw html`this was thrown`
			},
		}),
		'<?[>this was thrown<?]>',
	)
})
