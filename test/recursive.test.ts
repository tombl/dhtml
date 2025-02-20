import { html } from 'dhtml'
import { setup } from './setup'
import { describe, it } from 'vitest'

const DEPTH = 10

describe('recursion', () => {
	it('handles basic recursion', ({ expect }) => {
		const { root, el } = setup()

		const app = {
			renders: 0,
			render() {
				if (++this.renders > DEPTH) return 'hello!'
				return this
			},
		}
		root.render(app)
		expect(el.innerHTML).toBe('hello!')
	})

	it('handles nested recursion', ({ expect }) => {
		const { root, el } = setup()

		const app = {
			renders: 0,
			render() {
				if (++this.renders > DEPTH) return 'hello!'
				return html`<span>${this}</span>`
			},
		}
		root.render(app)
		expect(el.innerHTML).toBe('<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
	})
})
