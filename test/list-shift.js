import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test.todo('list-shift', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [, item2, item3] = root.children

	items.shift()
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 2</p><p>Item 3</p>]')
	expect(root.children[0]).toBe(item2)
	expect(root.children[1]).toBe(item3)

	items.shift()
	r.render(wrapped)
	expect(root.innerHTML).toBe('[<p>Item 3</p>]')
	expect(root.children[0]).toBe(item3)

	items.shift()
	r.render(wrapped)
	expect(root.innerHTML).toBe('[]')
})
