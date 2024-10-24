import { assert } from './_lib.js'
import { Root, html } from '../html.js'

export default root => {
	const r = Root.appendInto(root)

	r.render(
		html`${{
			render() {
				return html`<h1>Hello, world!</h1>`
			},
		}}`,
	)
	assert.eq(root.innerHTML, '<h1>Hello, world!</h1>')

	let controller
	r.render(
		html`${{
			i: 0,
			render(c) {
				controller = c
				return html`Count: ${this.i++}`
			},
		}}`,
	)
	assert.eq(root.innerHTML, 'Count: 0')
	controller.invalidate()
	assert.eq(root.innerHTML, 'Count: 1')
	controller.invalidate()
	assert.eq(root.innerHTML, 'Count: 2')
}
