import { Root, html } from '../html.js'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	let items = null
	const listOfItems = () =>
		html`
			<ul>
				<li>Before</li>
				${items}
				<li>After</li>
			</ul>
		`

	r.render(listOfItems())
	items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`, html`<li>Item 3</li>`]

	r.render(listOfItems())
	assert.eq(
		root.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li> <li>After</li> </ul> ',
	)
	const [item1, item2, item3] = root.querySelectorAll('li')

	items.push(html`<li>Item 4</li>`)
	r.render(listOfItems())
	assert.eq(
		root.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li> <li>After</li> </ul> ',
	)
	const [item1b, item2b, item3b] = root.querySelectorAll('li')
	assert.eq(item1, item1b)
	assert.eq(item2, item2b)
	assert.eq(item3, item3b)

	items.pop()
	items.pop()
	r.render(listOfItems())
	assert.eq(
		root.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li> <li>After</li> </ul> ',
	)
	const [item1c, item2c] = root.querySelectorAll('li')
	assert.eq(item1, item1c)
	assert.eq(item2, item2c)
}
