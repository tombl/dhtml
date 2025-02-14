import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('custom-part-class', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

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
	expect(root.firstChild.style.cssText).toBe('color: red;')

	r.render(template(Flipper))
	expect(root.firstChild.style.cssText).toBe('transform: scaleX(-1);')

	r.render(template(null))
	expect(root.firstChild.style.cssText).toBe('')

	r.render(null)
})
