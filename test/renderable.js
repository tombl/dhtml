import { assert } from './_lib.js'
import { Root, html, invalidate } from '../html.js'

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

	const app = {
		i: 0,
		render() {
			return html`Count: ${this.i++}`
		},
	}
	r.render(app)
	assert.eq(root.innerHTML, 'Count: 0')
	r.render(app)
	assert.eq(root.innerHTML, 'Count: 1')
	invalidate(app)
	assert.eq(root.innerHTML, 'Count: 2')
	invalidate(app)
	assert.eq(root.innerHTML, 'Count: 3')
}
