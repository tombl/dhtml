import { assert } from './_lib.js'
import { Root, html } from '../html.js'

export default root => {
	const r = Root.appendInto(root)

	const sequence = []

	const inner = {
		render(controller) {
			sequence.push('inner render')
			controller.signal.onabort = () => {
				sequence.push('inner abort')
			}
			return 'inner'
		},
	}

	const outer = {
		show: true,
		render(controller) {
			sequence.push('outer render')
			controller.signal.onabort = () => {
				sequence.push('outer abort')
			}
			if (!this.show) return null
			return inner
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
