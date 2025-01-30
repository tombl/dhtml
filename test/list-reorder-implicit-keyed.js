import { Root, html } from 'dhtml'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	const items = [html`<h1>Item 1</h1>`, html`<h2>Item 2</h2>`]

	r.render(items)
	assert.eq(root.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')
	assert.eq(root.children[0].tagName, 'H1')
	assert.eq(root.children[1].tagName, 'H2')
	const original = [...root.children]

	;[items[0], items[1]] = [items[1], items[0]]

	r.render(items)
	assert.eq(root.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')
	assert.eq(root.children[0].tagName, 'H2')
	assert.eq(root.children[1].tagName, 'H1')

	assert.eq(root.children[0], original[1])
	assert.eq(root.children[1], original[0])
}
