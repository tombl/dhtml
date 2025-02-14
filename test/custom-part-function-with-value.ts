import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('custom-part-function-with-value', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	let init = 0
	let detached = false

	function classes(node, value) {
		init++
		let prev
		update(value)

		return {
			update,
			detach() {
				update([])
				detached = true
			},
		}

		function update(value) {
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

	const template = value => html`<div ${classes}=${value}>Hello, world!</div>`

	r.render(template(['a', 'b']))
	expect(root.firstChild.className).toBe('a b')

	r.render(template(['c', 'd']))
	expect(root.firstChild.className).toBe('c d')

	expect(init).toBe(1) // should only be constructed once

	expect(detached).toBe(false)
	r.render(null)
	expect(detached).toBe(true)
})
