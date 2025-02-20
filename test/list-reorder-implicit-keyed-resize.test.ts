import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test.todo('list-reorder-implicit-keyed-resize', () => {
	const { root, el } = setup()

	const items = [
		html`<h1>Item 1</h1>`,
		html`
			<h2>Item 2</h2>
			<p>Body content</p>
		`,
	]

	root.render(items)
	expect(el.innerHTML.replace(/\s+/g, ' ')).toBe('<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	expect(el.children[0].tagName).toBe('H1')
	expect(el.children[1].tagName).toBe('H2')
	expect(el.children[2].tagName).toBe('P')
	const original = [...el.children]

	// Swap
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(items)
	expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(' <h2>Item 2</h2> <p>Body content</p> <h1>Item 1</h1>')
	expect(el.children[0].tagName).toBe('H2')
	expect(el.children[1].tagName).toBe('P')
	expect(el.children[2].tagName).toBe('H1')

	expect(el.children[0]).toBe(original[1])
	expect(el.children[1]).toBe(original[2])
	expect(el.children[2]).toBe(original[0])

	// Swap back
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(items)
	expect(el.innerHTML.replace(/\s+/g, ' ')).toBe('<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	expect(el.children[0].tagName).toBe('H1')
	expect(el.children[1].tagName).toBe('H2')
	expect(el.children[2].tagName).toBe('P')
	expect(el.children[0]).toBe(original[0])
	expect(el.children[1]).toBe(original[1])
	expect(el.children[2]).toBe(original[2])
})
