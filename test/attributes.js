import { assert } from './_lib.js'
import { Root, html } from '../html.js'

export default root => {
	const r = Root.appendInto(root)

	let clicked = false
	r.render(html`
		<h1 style=${'color: red'}>Hello, world!</h1>
		<h2 .class-name=${'foo'}>Hello, world!</h2>
		<details ?open=${true}></details>
		<button
			@click=${() => {
				clicked = true
			}}
		>
			Click me
		</button>
	`)
	assert.eq(root.querySelector('h1').style.color, 'red')
	assert.eq(root.querySelector('h2').className, 'foo')
	assert.eq(root.querySelector('details').open, true)

	assert.eq(clicked, false)
	root.querySelector('button').click()
	assert.eq(clicked, true)
}
