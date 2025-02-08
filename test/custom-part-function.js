import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('custom-part-function', () => {
	const root = document.createElement('div')
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
	expect(root.firstChild.style.cssText).toBe('color: red;')

	r.render(template(flipper))
	expect(root.firstChild.style.cssText).toBe('transform: scaleX(-1);')

	r.render(template(null))
	expect(root.firstChild.style.cssText).toBe('')

	r.render(null)
})
