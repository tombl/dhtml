import { html, invalidate } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('renderable', async () => {
	const { root, el } = setup()

	root.render(
		html`${{
			render() {
				return html`<h1>Hello, world!</h1>`
			},
		}}`,
	)
	expect(el.innerHTML).toBe('<h1>Hello, world!</h1>')

	const app = {
		i: 0,
		render() {
			return html`Count: ${this.i++}`
		},
	}
	root.render(app)
	expect(el.innerHTML).toBe('Count: 0')
	root.render(app)
	expect(el.innerHTML).toBe('Count: 1')
	await invalidate(app)
	expect(el.innerHTML).toBe('Count: 2')
	await invalidate(app)
	expect(el.innerHTML).toBe('Count: 3')
	expect(app.i).toBe(4)
})
