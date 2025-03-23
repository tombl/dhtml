import { html } from 'dhtml'
import test, { type TestContext } from 'node:test'
import { setup } from './setup.ts'

const DEPTH = 10

test('basic recursion is handled correctly', (t: TestContext) => {
	const { root, el } = setup()

	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return this
		},
	}
	root.render(app)
	t.assert.strictEqual(el.innerHTML, 'hello!')
})

test('nested recursion is handled correctly', (t: TestContext) => {
	const { root, el } = setup()

	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return html`<span>${this}</span>`
		},
	}
	root.render(app)
	t.assert.strictEqual(el.innerHTML, '<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
})
