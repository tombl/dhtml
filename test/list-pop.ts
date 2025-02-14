import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('list-pop', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2] = root.children

	items.pop()
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p>]')
	expect(root.children[0]).toBe(item1)
	expect(root.children[1]).toBe(item2)

	items.pop()
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 1</p>]')
	expect(root.children[0]).toBe(item1)

	items.pop()
	r.render(wrapped)
	expect(root.innerHTML).toBe('[]')
})
