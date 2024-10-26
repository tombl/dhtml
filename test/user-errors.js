import { Root, html } from '../html.js'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	let thrown
	try {
		r.render(html`<button @click=${123}></button>`)
	} catch (error) {
		thrown = error
	}
	assert.eq(root.innerHTML, '<button></button>')
	assert(thrown instanceof Error && /expected a function/i.test(thrown.message))
}
