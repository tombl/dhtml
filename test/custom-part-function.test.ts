import { Root, html, type CustomPart } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('custom-part-function', () => {
	const { root, el } = setup()

	const redifier: CustomPart = node => {
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
	const flipper: CustomPart = node => {
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

	root.render(template(redifier))
	const div = el.firstChild as HTMLElement
	expect(div.tagName).toBe('DIV')
	expect(div.style.cssText).toBe('color: red;')

	root.render(template(flipper))
	expect(div.style.cssText).toBe('transform: scaleX(-1);')

	root.render(template(null))
	expect(div.style.cssText).toBe('')

	root.render(null)
})
