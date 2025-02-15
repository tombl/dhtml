import { Root, html, type CustomPart } from 'dhtml'
import { expect, test } from 'vitest'

test('custom-part-class', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

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

	r.render(template(Redifier))
	const div = root.firstChild as HTMLElement
	expect(div.nodeName).toBe('DIV')
	expect(div.style.cssText).toBe('color: red;')

	r.render(template(Flipper))
	expect(div.style.cssText).toBe('transform: scaleX(-1);')

	r.render(template(null))
	expect(div.style.cssText).toBe('')

	r.render(null)
})
