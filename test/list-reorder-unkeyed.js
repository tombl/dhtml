import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('list-reorder-unkeyed', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const a = () => html`<h1>Item 1</h1>`
	const b = () => html`<h2>Item 2</h2>`

	r.render([a(), b()])
	expect(root.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
	expect(root.children[0].tagName).toBe('H1')
	expect(root.children[1].tagName).toBe('H2')
	const original = [...root.children]

	r.render([b(), a()])
	expect(root.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
	expect(root.children[0].tagName).toBe('H2')
	expect(root.children[1].tagName).toBe('H1')

	expect(root.children[0]).not.toBe(original[1])
	expect(root.children[1]).not.toBe(original[0])
})
