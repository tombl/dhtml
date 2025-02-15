import { Root, html } from 'dhtml'
import { describe, it } from 'vitest'

const DEPTH = 10

describe('recursion', () => {
	it('handles basic recursion', ({ expect }) => {
		const root = document.createElement('div')
		const r = Root.appendInto(root)

		const app = {
			renders: 0,
			render() {
				if (++this.renders > DEPTH) return 'hello!'
				return this
			},
		}
		r.render(app)
		expect(root.innerHTML).toBe('hello!')
	})

	it('handles nested recursion', ({ expect }) => {
		const root = document.createElement('div')
		const r = Root.appendInto(root)

		const app = {
			renders: 0,
			render() {
				if (++this.renders > DEPTH) return 'hello!'
				return html`<span>${this}</span>`
			},
		}
		r.render(app)
		expect(root.innerHTML).toBe('<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
	})
})
