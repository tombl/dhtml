import { assert } from './_lib.js'
import { Root, html } from 'dhtml'

export default root => {
	const template = n => html`<h1>Hello, ${n}!</h1>`
	const template2 = n => html`<h1>Hello, ${n}!</h1>`

	const r = Root.appendInto(root)

	r.render(template(1))
	assert.eq(root.innerHTML, '<h1>Hello, 1!</h1>')
	let h1 = root.children[0]
	const text = h1.childNodes[1]
	assert(text instanceof Text)
	assert.eq(text.textContent, '1')

	r.render(template(2))
	assert.eq(root.innerHTML, '<h1>Hello, 2!</h1>')
	assert.eq(root.children[0], h1)
	assert.eq(text.textContent, '2')
	assert.eq(h1.childNodes[1], text)

	r.render(template2(3))
	assert.eq(root.innerHTML, '<h1>Hello, 3!</h1>')
	assert(root.children[0] !== h1)
	h1 = root.children[0]

	r.render(template2(template(template('inner'))))
	assert.eq(root.innerHTML, '<h1>Hello, <h1>Hello, <h1>Hello, inner!</h1>!</h1>!</h1>')
	assert.eq(root.children[0], h1)
}
