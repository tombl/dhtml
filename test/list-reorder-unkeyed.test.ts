import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test.todo('list-reorder-unkeyed', () => {
	const { root, el } = setup()

	const a = () => html`<h1>Item 1</h1>`
	const b = () => html`<h2>Item 2</h2>`

	root.render([a(), b()])
	expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
	expect(el.children[0].tagName).toBe('H1')
	expect(el.children[1].tagName).toBe('H2')
	const original = [...el.children]

	root.render([b(), a()])
	expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
	expect(el.children[0].tagName).toBe('H2')
	expect(el.children[1].tagName).toBe('H1')

	expect(el.children[0]).not.toBe(original[1])
	expect(el.children[1]).not.toBe(original[0])
})
