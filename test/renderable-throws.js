import { assert } from './_lib.js'
import { Root, html } from '../html.js'

export default root => {
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
	assert.eq(thrown, oops)

	// on an error, don't leave any visible artifacts
	assert.eq(root.innerHTML, '<!---->')
}
