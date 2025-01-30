import { assert } from './_lib.js'
import { Root, html } from 'dhtml'

export default root => {
	const r = Root.appendInto(root)

	function redifier(node) {
		node.style.color = 'red'
		return {
			update() {
				throw new Error('should never get here')
			},
			detach() {
				node.style.color = ''
			},
		}
	}
	const flipper = node => {
		node.style.transform = 'scaleX(-1)'
		return {
			update() {
				throw new Error('should never get here')
			},
			detach() {
				node.style.transform = ''
			},
		}
	}

	const template = Part => html`<div ${Part}>Hello, world!</div>`

	r.render(template(redifier))
	assert.eq(root.firstChild.style.cssText, 'color: red;')

	r.render(template(flipper))
	assert.eq(root.firstChild.style.cssText, 'transform: scaleX(-1);')

	r.render(template(null))
	assert.eq(root.firstChild.style.cssText, '')

	r.render(null)
}
