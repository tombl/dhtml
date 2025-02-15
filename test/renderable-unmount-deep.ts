import { Root, onUnmount } from 'dhtml'
import { expect, test } from 'vitest'

test('renderable-unmount-deep', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const sequence: string[] = []

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
			if (!this.show) return null
			return inner
		},
	}

	outer.show = true
	r.render(outer)
	expect(root.innerHTML).toBe('inner')
	expect(sequence).toEqual(['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	r.render(outer)
	expect(root.innerHTML).toBe('')
	expect(sequence).toEqual(['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	r.render(outer)
	expect(root.innerHTML).toBe('inner')
	expect(sequence).toEqual(['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	r.render(outer)
	expect(root.innerHTML).toBe('')
	expect(sequence).toEqual(['outer render', 'inner abort'])
	sequence.length = 0
})
