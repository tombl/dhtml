import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('renderable-throws', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const oops = new Error('oops')
	let thrown
	try {
		r.render(
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
	expect(root.innerHTML).toBe('<!---->')
})
