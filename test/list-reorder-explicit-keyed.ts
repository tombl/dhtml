import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

function keyed<T>(renderable: T, _key: unknown) {
	return renderable
}

test.todo('list-reorder-explicit-keyed', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const a = () => keyed(html`<h1>Item 1</h1>`, 1)
	const b = () => keyed(html`<h2>Item 2</h2>`, 2)

	r.render([a(), b()])
	expect(root.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
	expect(root.children[0].tagName).toBe('H1')
	expect(root.children[1].tagName).toBe('H2')
	const original = [...root.children]

	r.render([b(), a()])
	expect(root.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
	expect(root.children[0].tagName).toBe('H2')
	expect(root.children[1].tagName).toBe('H1')

	expect(root.children[0]).toBe(original[1])
	expect(root.children[1]).toBe(original[0])
})
