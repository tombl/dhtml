import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test('user-errors', () => {
	const { root, el } = setup()

	let thrown
	try {
		root.render(html`<button @click=${123}></button>`)
	} catch (error) {
		thrown = error as Error
	}

	expect(el.innerHTML).toBe('<button></button>')
	expect(thrown).toBeInstanceOf(Error)
	expect(thrown!.message).toMatch(/expected a function/i)
})
