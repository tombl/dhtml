import { assert } from './_lib.js'
import { Root, html } from 'dhtml'

export default root => {
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
	assert.eq(root.firstChild.className, 'a b')

	r.render(template(['c', 'd']))
	assert.eq(root.firstChild.className, 'c d')

	assert.eq(init, 1) // should only be constructed once

	assert(!detached)
	r.render(null)
	assert(detached)
}
