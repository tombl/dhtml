import { assert } from './_lib.js'
import { html, Root, onUnmount } from '../html.js'

export default root => {
	const r = Root.appendInto(root)

	const sequence = []

	const inner = {
		attached: false,
		render() {
			sequence.push('inner render')
			if (!this.attached) {
				this.attached = true
				onUnmount(this, () => {
					this.attached = false
					sequence.push('inner abort')
				})
			}
			return 'inner'
		},
	}

	const outer = {
		attached: false,
		show: true,
		render() {
			sequence.push('outer render')
			if (!this.attached) {
				this.attached = true
				onUnmount(this, () => {
					this.attached = false
					sequence.push('outer abort')
				})
			}
			return html`${this.show ? inner : null}`
		},
	}

	outer.show = true
	r.render(outer)
	assert.eq(root.innerHTML, 'inner')
	assert.deepEq(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	r.render(outer)
	assert.eq(root.innerHTML, '')
	assert.deepEq(sequence, ['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	r.render(outer)
	assert.eq(root.innerHTML, 'inner')
	assert.deepEq(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	r.render(outer)
	assert.eq(root.innerHTML, '')
	assert.deepEq(sequence, ['outer render', 'inner abort'])
	sequence.length = 0
}
