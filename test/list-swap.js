import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('list-swap', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2, item3] = root.children

	// swap the first two items
	;[items[0], items[1]] = [items[1], items[0]]
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 2</p><p>Item 1</p><p>Item 3</p>]')
	expect(root.children[0]).toBe(item2)
	expect(root.children[1]).toBe(item1)
	expect(root.children[2]).toBe(item3)

	// swap the last two items
	;[items[1], items[2]] = [items[2], items[1]]
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 2</p><p>Item 3</p><p>Item 1</p>]')
	expect(root.children[0]).toBe(item2)
	expect(root.children[1]).toBe(item3)
	expect(root.children[2]).toBe(item1)

	// swap the first and last items
	;[items[0], items[2]] = [items[2], items[0]]
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 1</p><p>Item 3</p><p>Item 2</p>]')
	expect(root.children[0]).toBe(item1)
	expect(root.children[1]).toBe(item3)
	expect(root.children[2]).toBe(item2)

	// put things back
	;[items[1], items[2]] = [items[2], items[1]]
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	expect(root.children[0]).toBe(item1)
	expect(root.children[1]).toBe(item2)
	expect(root.children[2]).toBe(item3)
})
