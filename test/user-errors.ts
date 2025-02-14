import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('user-errors', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	let thrown
	try {
		r.render(html`<button @click=${123}></button>`)
	} catch (error) {
		thrown = error
	}
	expect(root.innerHTML).toBe('<button></button>')
	expect(thrown).instanceOf(Error)
	expect((thrown as Error).message).toMatch(/expected a function/i)
})
