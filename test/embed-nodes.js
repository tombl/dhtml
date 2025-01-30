import { Root, html } from 'dhtml'
import { assert, h } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	let node = h('span')

	r.render(html`<div>${node}</div>`)
	assert.eq(root.innerHTML, '<div><span></span></div>')
	assert.eq(root.children[0].children[0], node)

	node = document.createDocumentFragment()
	node.append(h('h1'), h('h2'), h('h3'))

	r.render(html`<div>${node}</div>`)
	assert.eq(root.innerHTML, '<div><h1></h1><h2></h2><h3></h3></div>')
	assert.eq(node.children.length, 0)
}
