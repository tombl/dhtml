import { Root, html } from 'dhtml'
import { assert, h } from './_lib.js'

export default root => {
	root.append(h('div', {}, 'before'))

	const r = Root.appendInto(root)

	r.render(html`<h1>Hello, world!</h1>`)
	assert.eq(root.innerHTML, '<div>before</div><h1>Hello, world!</h1>')

	root.append(h('div', {}, 'after'))
	r.render(html`<h2>Goodbye, world!</h2>`)
	assert.eq(root.innerHTML, '<div>before</div><h2>Goodbye, world!</h2><div>after</div>')

	r.render(html``)
	assert.eq(root.innerHTML, '<div>before</div><div>after</div>')

	r.render(html`<h1>Hello, world!</h1>`)
	assert.eq(root.innerHTML, '<div>before</div><h1>Hello, world!</h1><div>after</div>')
}
