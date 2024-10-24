import { assert } from './_lib.js'
import { Root, html } from '../html.js'

export default root => {
	const r = Root.appendInto(root)

	const sequence = []

	class Redifier {
		#node
		constructor(node) {
			this.#node = node
			node.style.color = 'red'
		}
		update() {
			throw new Error('should never get here')
		}
		detach() {
			this.#node.style.color = ''
		}
	}
	class Flipper {
		#node
		constructor(node) {
			this.#node = node
			node.style.transform = 'scaleX(-1)'
		}
		update() {
			throw new Error('should never get here')
		}
		detach() {
			this.#node.style.transform = ''
		}
	}

	const template = Part => html`<div ${Part}>Hello, world!</div>`

	r.render(template(Redifier))
	assert.eq(root.firstChild.style.cssText, 'color: red;')

	r.render(template(Flipper))
	assert.eq(root.firstChild.style.cssText, 'transform: scaleX(-1);')

	r.render(template(null))
	assert.eq(root.firstChild.style.cssText, '')
}
