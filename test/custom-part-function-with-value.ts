import { Root, html, type CustomPart } from 'dhtml'
import { expect, test } from 'vitest'

test('custom-part-function-with-value', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

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

	r.render(template(['a', 'b']))
	const div = root.firstChild as HTMLElement
	expect(div.tagName).toBe('DIV')
	expect(div.className).toBe('a b')

	r.render(template(['c', 'd']))
	expect(div.className).toBe('c d')

	expect(init).toBe(1) // should only be constructed once

	expect(detached).toBe(false)
	r.render(null)
	expect(detached).toBe(true)
})
