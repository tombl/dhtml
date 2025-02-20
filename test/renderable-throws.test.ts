import { html } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('renderable-throws', () => {
	const { root, el } = setup()

	const oops = new Error('oops')
	let thrown
	try {
		root.render(
			html`${{
				render() {
					throw oops
				},
			}}`,
		)
	} catch (error) {
		thrown = error
	}
	expect(thrown).toBe(oops)

	// on an error, don't leave any visible artifacts
	expect(el.innerHTML).toBe('<!---->')
})
