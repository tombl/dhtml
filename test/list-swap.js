import { Root, html } from '../html.js'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2, item3] = root.children

	// swap the first two items
	;[items[0], items[1]] = [items[1], items[0]]
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 2</p><p>Item 1</p><p>Item 3</p>]')
	assert.eq(root.children[0], item2)
	assert.eq(root.children[1], item1)
	assert.eq(root.children[2], item3)

	// swap the last two items
	;[items[1], items[2]] = [items[2], items[1]]
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 2</p><p>Item 3</p><p>Item 1</p>]')
	assert.eq(root.children[0], item2)
	assert.eq(root.children[1], item3)
	assert.eq(root.children[2], item1)

	// swap the first and last items
	;[items[0], items[2]] = [items[2], items[0]]
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 1</p><p>Item 3</p><p>Item 2</p>]')
	assert.eq(root.children[0], item1)
	assert.eq(root.children[1], item3)
	assert.eq(root.children[2], item2)

	// put things back
	;[items[1], items[2]] = [items[2], items[1]]
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	assert.eq(root.children[0], item1)
	assert.eq(root.children[1], item2)
	assert.eq(root.children[2], item3)
}
