import { Root, html, invalidate } from 'dhtml'
import { expect, test } from 'vitest'

test('renderable', async () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	r.render(
		html`${{
			render() {
				return html`<h1>Hello, world!</h1>`
			},
		}}`,
	)
	expect(root.innerHTML).toBe('<h1>Hello, world!</h1>')

	const app = {
		i: 0,
		render() {
			return html`Count: ${this.i++}`
		},
	}
	r.render(app)
	expect(root.innerHTML).toBe('Count: 0')
	r.render(app)
	expect(root.innerHTML).toBe('Count: 1')
	await invalidate(app)
	expect(root.innerHTML).toBe('Count: 2')
	await invalidate(app)
	expect(root.innerHTML).toBe('Count: 3')
})
