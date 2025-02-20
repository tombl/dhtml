import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test('embed-nodes', () => {
	const { root, el } = setup()

	let node: ParentNode = document.createElement('span')

	root.render(html`<div>${node}</div>`)
	expect(el.innerHTML).toBe('<div><span></span></div>')
	expect(el.children[0].children[0]).toBe(node)

	node = document.createDocumentFragment()
	node.append(document.createElement('h1'), document.createElement('h2'), document.createElement('h3'))

	root.render(html`<div>${node}</div>`)
	expect(el.innerHTML).toBe('<div><h1></h1><h2></h2><h3></h3></div>')
	expect(node.children.length).toBe(0)
})
