import { Root, html, type CustomPart } from 'dhtml'
import { expect, test } from 'vitest'

test('custom-part-function', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const redifier: CustomPart = (node) => {
		if (!(node instanceof HTMLElement)) throw new Error('expected HTMLElement')
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
	const flipper: CustomPart = (node) => {
		if (!(node instanceof HTMLElement)) throw new Error('expected HTMLElement')
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

	const template = (Part: CustomPart | null) => html`<div ${Part}>Hello, world!</div>`

	r.render(template(redifier))
	const div = root.firstChild as HTMLElement
	expect(div.tagName).toBe('DIV')
	expect(div.style.cssText).toBe('color: red;')

	r.render(template(flipper))
	expect(div.style.cssText).toBe('transform: scaleX(-1);')

	r.render(template(null))
	expect(div.style.cssText).toBe('')

	r.render(null)
})
