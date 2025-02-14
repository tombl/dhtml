import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

const DEPTH = 10

test('recursive', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	r.render({
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return this
		},
	})
	expect(root.innerHTML).toBe('hello!')

	r.render({
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return html`<span>${this}</span>`
		},
	})
	expect(root.innerHTML).toBe('<span>'.repeat(DEPTH) + 'hello!' + '</span>'.repeat(DEPTH))
})
