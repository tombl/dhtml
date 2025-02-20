import { onUnmount } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('renderable-unmount-deep', () => {
	const { root, el } = setup()

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
	root.render(outer)
	expect(el.innerHTML).toBe('inner')
	expect(sequence).toEqual(['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	expect(el.innerHTML).toBe('')
	expect(sequence).toEqual(['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	root.render(outer)
	expect(el.innerHTML).toBe('inner')
	expect(sequence).toEqual(['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	expect(el.innerHTML).toBe('')
	expect(sequence).toEqual(['outer render', 'inner abort'])
	sequence.length = 0
})
