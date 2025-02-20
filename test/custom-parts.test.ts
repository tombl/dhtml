import { html, type CustomPart } from 'dhtml'
import { describe, expect, it } from 'vitest'
import { setup } from './setup'

describe('custom parts', () => {
	it('classes', () => {
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

	it('classes with values', () => {
		const { root, el } = setup()

		let init = 0
		let detached = false

		class Classes {
			#node
			constructor(node: Element, value: string[]) {
				init++
				this.#node = node
				this.update(value)
			}

			#prev: Set<string> | undefined
			update(value: string[]) {
				const added = new Set(value)
				for (const name of added) {
					this.#prev?.delete(name)
					this.#node.classList.add(name)
				}
				for (const name of this.#prev ?? []) {
					this.#node.classList.remove(name)
				}
				this.#prev = added
			}

			detach() {
				this.update([])
				detached = true
			}
		}

		const template = (value: string[]) => html`<div ${Classes}=${value}>Hello, world!</div>`

		root.render(template(['a', 'b']))
		const div = el.firstChild as Element
		expect(div.tagName).toBe('DIV')
		expect(div.className).toBe('a b')

		root.render(template(['c', 'd']))
		expect(div.className).toBe('c d')

		expect(init).toBe(1) // should only be constructed once

		expect(detached).toBe(false)
		root.render(null)
		expect(detached).toBe(true)
	})

	it('functions', () => {
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

	it('functions with values', () => {
		const { root, el } = setup()

		let init = 0
		let detached = false

		const classes: CustomPart<string[]> = (node, value) => {
			init++
			let prev: Set<string> | undefined
			update(value)

			return {
				update,
				detach() {
					update([])
					detached = true
				},
			}

			function update(value: string[]) {
				const added = new Set(value)
				for (const name of added) {
					prev?.delete(name)
					node.classList.add(name)
				}
				for (const name of prev ?? []) {
					node.classList.remove(name)
				}
				prev = added
			}
		}

		const template = (value: string[]) => html`<div ${classes}=${value}>Hello, world!</div>`

		root.render(template(['a', 'b']))
		const div = el.firstChild as HTMLElement
		expect(div.tagName).toBe('DIV')
		expect(div.className).toBe('a b')

		root.render(template(['c', 'd']))
		expect(div.className).toBe('c d')

		expect(init).toBe(1) // should only be constructed once

		expect(detached).toBe(false)
		root.render(null)
		expect(detached).toBe(true)
	})
})
