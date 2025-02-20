import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test('list-pop', () => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2] = el.children

	items.pop()
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p>]')
	expect(el.children[0]).toBe(item1)
	expect(el.children[1]).toBe(item2)

	items.pop()
	root.render(wrapped)
	expect(el.innerHTML).toBe('[<p>Item 1</p>]')
	expect(el.children[0]).toBe(item1)

	items.pop()
	root.render(wrapped)
	expect(el.innerHTML).toBe('[]')
})
