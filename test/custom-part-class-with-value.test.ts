import { html } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('custom-part-class-with-value', () => {
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
