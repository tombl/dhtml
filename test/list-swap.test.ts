import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test.todo('list-swap', () => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2, item3] = el.children

	// swap the first two items
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 2</p><p>Item 1</p><p>Item 3</p>]')
	expect(el.children[0]).toBe(item2)
	expect(el.children[1]).toBe(item1)
	expect(el.children[2]).toBe(item3)

	// swap the last two items
	;[items[1], items[2]] = [items[2], items[1]]
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 2</p><p>Item 3</p><p>Item 1</p>]')
	expect(el.children[0]).toBe(item2)
	expect(el.children[1]).toBe(item3)
	expect(el.children[2]).toBe(item1)

	// swap the first and last items
	;[items[0], items[2]] = [items[2], items[0]]
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 3</p><p>Item 2</p>]')
	expect(el.children[0]).toBe(item1)
	expect(el.children[1]).toBe(item3)
	expect(el.children[2]).toBe(item2)

	// put things back
	;[items[1], items[2]] = [items[2], items[1]]
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	expect(el.children[0]).toBe(item1)
	expect(el.children[1]).toBe(item2)
	expect(el.children[2]).toBe(item3)
})
