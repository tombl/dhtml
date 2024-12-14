import { Root, html } from 'dhtml'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [, item2, item3] = root.children

	items.shift()
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 2</p><p>Item 3</p>]')
	assert.eq(root.children[0], item2)
	assert.eq(root.children[1], item3)

	items.shift()
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 3</p>]')
	assert.eq(root.children[0], item3)

	items.shift()
	r.render(wrapped)
	assert.eq(root.innerHTML, '[]')
}
