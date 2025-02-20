import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test.todo('list-reorder-implicit-keyed-renderable', () => {
	const { root, el } = setup()

	const items = [{ render: () => html`<h1>Item 1</h1>` }, { render: () => html`<h2>Item 2</h2>` }]

	root.render(items)
	expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
	expect(el.children[0].tagName).toBe('H1')
	expect(el.children[1].tagName).toBe('H2')
	const original = [...el.children]

	;[items[0], items[1]] = [items[1], items[0]]

	root.render(items)
	expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
	expect(el.children[0].tagName).toBe('H2')
	expect(el.children[1].tagName).toBe('H1')

	expect(el.children[0]).toBe(original[1])
	expect(el.children[1]).toBe(original[0])
})
