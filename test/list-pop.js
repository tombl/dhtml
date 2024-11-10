import { Root, html } from '../html.js'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2] = root.children

	items.pop()
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 1</p><p>Item 2</p>]')
	assert.eq(root.children[0], item1)
	assert.eq(root.children[1], item2)

	items.pop()
	r.render(wrapped)
	assert.eq(root.innerHTML, '[<p>Item 1</p>]')
	assert.eq(root.children[0], item1)

	items.pop()
	r.render(wrapped)
	assert.eq(root.innerHTML, '[]')
}
