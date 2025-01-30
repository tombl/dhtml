import { Root, html } from 'dhtml'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	const a = () => html`<h1>Item 1</h1>`
	const b = () => html`<h2>Item 2</h2>`

	r.render([a(), b()])
	assert.eq(root.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')
	assert.eq(root.children[0].tagName, 'H1')
	assert.eq(root.children[1].tagName, 'H2')
	const original = [...root.children]

	r.render([b(), a()])
	assert.eq(root.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')
	assert.eq(root.children[0].tagName, 'H2')
	assert.eq(root.children[1].tagName, 'H1')

	assert(root.children[0] !== original[1])
	assert(root.children[1] !== original[0])
}
