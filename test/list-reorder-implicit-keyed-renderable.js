import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('list-reorder-implicit-keyed-renderable', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const items = [{ render: () => html`<h1>Item 1</h1>` }, { render: () => html`<h2>Item 2</h2>` }]

	r.render(items)
	expect(root.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
	expect(root.children[0].tagName).toBe('H1')
	expect(root.children[1].tagName).toBe('H2')
	const original = [...root.children]

	;[items[0], items[1]] = [items[1], items[0]]

	r.render(items)
	expect(root.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
	expect(root.children[0].tagName).toBe('H2')
	expect(root.children[1].tagName).toBe('H1')

	expect(root.children[0]).toBe(original[1])
	expect(root.children[1]).toBe(original[0])
})
