import { assert } from './_lib.js'
import { Root, html } from '../html.js'

export default root => {
	const r = Root.appendInto(root)

	const sequence = []
	let init = 0

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
			throw new Error('should never get here')

			// if this were a more general purpose class, we would do:
			// this.update([]);
		}
	}

	const template = value => html`<div ${Classes}=${value}>Hello, world!</div>`

	r.render(template(['a', 'b']))
	assert.eq(root.firstChild.className, 'a b')

	r.render(template(['c', 'd']))
	assert.eq(root.firstChild.className, 'c d')

	assert.eq(init, 1) // should only be constructed once
}
