import { Root, html } from '../html.js'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	r.render(html`<h1>Hello, world!</h1>`)
	assert.eq(root.innerHTML, '<h1>Hello, world!</h1>')

	r.render(html`<h1>${html`Inner content!`}</h1>`)
	assert.eq(root.innerHTML, '<h1>Inner content!</h1>')

	const template = n => html`<h1>Hello, ${n}!</h1>`
	r.render(template(1))
	assert.eq(root.innerHTML, '<h1>Hello, 1!</h1>')
}
