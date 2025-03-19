import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import { assert_eq, test } from '../../../scripts/test/test.ts'

const DEPTH = 10

test('basic recursion is handled correctly', async () => {
	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return this
		},
	}
	assert_eq(await renderToString(app), 'hello!')
})

test('nested recursion is handled correctly', async () => {
	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return html`<span>${this}</span>`
		},
	}
	assert_eq(await renderToString(app), '<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
})
