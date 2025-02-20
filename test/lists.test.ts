import { Root, html, type Displayable } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('lists', () => {
	const { root, el } = setup()

	let items: Displayable[] | null = null
	const listOfItems = () => html`
		<ul>
			<li>Before</li>
			${items}
			<li>After</li>
		</ul>
	`

	root.render(listOfItems())
	expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(' <ul> <li>Before</li> <li>After</li> </ul> ')

	items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`, html`<li>Item 3</li>`]

	root.render(listOfItems())
	expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li> <li>After</li> </ul> ',
	)
	const [item1, item2, item3] = el.querySelectorAll('li')

	items.push(html`<li>Item 4</li>`)
	root.render(listOfItems())
	expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li> <li>After</li> </ul> ',
	)
	const [item1b, item2b, item3b] = el.querySelectorAll('li')
	expect(item1).toBe(item1b)
	expect(item2).toBe(item2b)
	expect(item3).toBe(item3b)

	items.pop()
	items.pop()
	root.render(listOfItems())
	expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li> <li>After</li> </ul> ',
	)
	const [item1c, item2c] = el.querySelectorAll('li')
	expect(item1).toBe(item1c)
	expect(item2).toBe(item2c)
})
