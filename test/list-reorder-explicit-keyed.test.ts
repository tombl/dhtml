import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

function keyed<T>(renderable: T, _key: unknown) {
	return renderable
}

test.todo('list-reorder-explicit-keyed', () => {
	const { root, el } = setup()

	const a = () => keyed(html`<h1>Item 1</h1>`, 1)
	const b = () => keyed(html`<h2>Item 2</h2>`, 2)

	root.render([a(), b()])
	expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
	expect(el.children[0].tagName).toBe('H1')
	expect(el.children[1].tagName).toBe('H2')
	const original = [...el.children]

	root.render([b(), a()])
	expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
	expect(el.children[0].tagName).toBe('H2')
	expect(el.children[1].tagName).toBe('H1')

	expect(el.children[0]).toBe(original[1])
	expect(el.children[1]).toBe(original[0])
})
