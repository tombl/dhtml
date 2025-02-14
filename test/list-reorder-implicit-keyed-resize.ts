import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test.todo('list-reorder-implicit-keyed-resize', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const items = [
		html`<h1>Item 1</h1>`,
		html`
			<h2>Item 2</h2>
			<p>Body content</p>
		`,
	]

	r.render(items)
	expect(root.innerHTML.replace(/\s+/g, ' ')).toBe('<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	expect(root.children[0].tagName).toBe('H1')
	expect(root.children[1].tagName).toBe('H2')
	expect(root.children[2].tagName).toBe('P')
	const original = [...root.children]

	// Swap
	;[items[0], items[1]] = [items[1], items[0]]
	r.render(items)
	expect(root.innerHTML.replace(/\s+/g, ' ')).toBe(' <h2>Item 2</h2> <p>Body content</p> <h1>Item 1</h1>')
	expect(root.children[0].tagName).toBe('H2')
	expect(root.children[1].tagName).toBe('P')
	expect(root.children[2].tagName).toBe('H1')

	expect(root.children[0]).toBe(original[1])
	expect(root.children[1]).toBe(original[2])
	expect(root.children[2]).toBe(original[0])

	// Swap back
	;[items[0], items[1]] = [items[1], items[0]]
	r.render(items)
	expect(root.innerHTML.replace(/\s+/g, ' ')).toBe('<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	expect(root.children[0].tagName).toBe('H1')
	expect(root.children[1].tagName).toBe('H2')
	expect(root.children[2].tagName).toBe('P')
	expect(root.children[0]).toBe(original[0])
	expect(root.children[1]).toBe(original[1])
	expect(root.children[2]).toBe(original[2])
})
