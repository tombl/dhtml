import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test.todo('list-shift', () => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [, item2, item3] = el.children

	items.shift()
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 2</p><p>Item 3</p>]')
	expect(el.children[0]).toBe(item2)
	expect(el.children[1]).toBe(item3)

	items.shift()
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 3</p>]')
	expect(el.children[0]).toBe(item3)

	items.shift()
	root.render(wrapped)
	expect(el.innerHTML).toBe('[]')
})
