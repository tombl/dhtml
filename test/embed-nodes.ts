import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('embed-nodes', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	let node: ParentNode = document.createElement('span')

	r.render(html`<div>${node}</div>`)
	expect(root.innerHTML).toBe('<div><span></span></div>')
	expect(root.children[0].children[0]).toBe(node)

	node = document.createDocumentFragment()
	node.append(document.createElement('h1'), document.createElement('h2'), document.createElement('h3'))

	r.render(html`<div>${node}</div>`)
	expect(root.innerHTML).toBe('<div><h1></h1><h2></h2><h3></h3></div>')
	expect(node.children.length).toBe(0)
})
