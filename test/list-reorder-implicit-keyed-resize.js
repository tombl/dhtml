import { Root, html } from '../html.js'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	const items = [
		html`<h1>Item 1</h1>`,
		html`
			<h2>Item 2</h2>
			<p>Body content</p>
		`,
	]

	r.render(items)
	assert.eq(root.innerHTML.replace(/\s+/g, ' '), '<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	assert.eq(root.children[0].tagName, 'H1')
	assert.eq(root.children[1].tagName, 'H2')
	assert.eq(root.children[2].tagName, 'P')
	const original = [...root.children]

	// Swap
	;[items[0], items[1]] = [items[1], items[0]]
	r.render(items)
	assert.eq(root.innerHTML.replace(/\s+/g, ' '), ' <h2>Item 2</h2> <p>Body content</p> <h1>Item 1</h1>')
	assert.eq(root.children[0].tagName, 'H2')
	assert.eq(root.children[1].tagName, 'P')
	assert.eq(root.children[2].tagName, 'H1')

	assert.eq(root.children[0], original[1])
	assert.eq(root.children[1], original[2])
	assert.eq(root.children[2], original[0])

	// Swap back
	;[items[0], items[1]] = [items[1], items[0]]
	r.render(items)
	assert.eq(root.innerHTML.replace(/\s+/g, ' '), '<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	assert.eq(root.children[0].tagName, 'H1')
	assert.eq(root.children[1].tagName, 'H2')
	assert.eq(root.children[2].tagName, 'P')
	assert.eq(root.children[0], original[0])
	assert.eq(root.children[1], original[1])
	assert.eq(root.children[2], original[2])
}
