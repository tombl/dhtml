import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('lists', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	let items = null
	const listOfItems = () => html`
		<ul>
			<li>Before</li>
			${items}
			<li>After</li>
		</ul>
	`

	r.render(listOfItems())
	expect(root.innerHTML.replace(/\s+/g, ' ')).toBe(' <ul> <li>Before</li> <li>After</li> </ul> ')

	items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`, html`<li>Item 3</li>`]

	r.render(listOfItems())
	expect(root.innerHTML.replace(/\s+/g, ' ')).toBe(
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li> <li>After</li> </ul> ',
	)
	const [item1, item2, item3] = root.querySelectorAll('li')

	items.push(html`<li>Item 4</li>`)
	r.render(listOfItems())
	expect(root.innerHTML.replace(/\s+/g, ' ')).toBe(
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li> <li>After</li> </ul> ',
	)
	const [item1b, item2b, item3b] = root.querySelectorAll('li')
	expect(item1).toBe(item1b)
	expect(item2).toBe(item2b)
	expect(item3).toBe(item3b)

	items.pop()
	items.pop()
	r.render(listOfItems())
	expect(root.innerHTML.replace(/\s+/g, ' ')).toBe(
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li> <li>After</li> </ul> ',
	)
	const [item1c, item2c] = root.querySelectorAll('li')
	expect(item1).toBe(item1c)
	expect(item2).toBe(item2c)
})
