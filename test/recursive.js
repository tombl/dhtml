import { Root, html } from 'dhtml'
import { assert } from './_lib.js'

const DEPTH = 10

export default root => {
	const r = Root.appendInto(root)

	r.render({
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return this
		},
	})
	assert.eq(root.innerHTML, 'hello!')

	r.render({
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return html`<span>${this}</span>`
		},
	})
	assert.eq(root.innerHTML, '<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
}
