import { html, type CustomPart } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('custom-part-class', () => {
	const { root, el } = setup()

	class Redifier {
		#node
		constructor(node: Element) {
			if (!(node instanceof HTMLElement)) throw new Error('expected HTMLElement')
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
		constructor(node: Element) {
			if (!(node instanceof HTMLElement)) throw new Error('expected HTMLElement')
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

	const template = (Part: CustomPart | null) => html`<div ${Part}>Hello, world!</div>`

	root.render(template(Redifier))
	const div = el.firstChild as HTMLElement
	expect(div.nodeName).toBe('DIV')
	expect(div.style.cssText).toBe('color: red;')

	root.render(template(Flipper))
	expect(div.style.cssText).toBe('transform: scaleX(-1);')

	root.render(template(null))
	expect(div.style.cssText).toBe('')

	root.render(null)
})
