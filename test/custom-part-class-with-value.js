import { assert } from './_lib.js'
import { Root, html } from 'dhtml'

export default root => {
	const r = Root.appendInto(root)

	let init = 0
	let detached = false

	class Classes {
		#node
		constructor(node, value) {
			init++
			this.#node = node
			this.update(value)
		}

		#prev
		update(value) {
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

	const template = value => html`<div ${Classes}=${value}>Hello, world!</div>`

	r.render(template(['a', 'b']))
	assert.eq(root.firstChild.className, 'a b')

	r.render(template(['c', 'd']))
	assert.eq(root.firstChild.className, 'c d')

	assert.eq(init, 1) // should only be constructed once

	assert(!detached)
	r.render(null)
	assert(detached)
}
