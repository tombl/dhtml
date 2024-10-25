import { assert, mock } from './_lib.js'
import { Root, html } from '../html.js'

export default root => {
	const r = Root.appendInto(root)

	let clicked = false
	r.render(html`
		<h1 style=${'color: red'}>Hello, world!</h1>
		<h2 .class-name=${'foo'}>Hello, world!</h2>
		<h3 .class-name="bar">Hello, world!</h3>
		<details open=${true}></details>
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
	assert.eq(root.querySelector('h3').className, 'bar')
	assert.eq(root.querySelector('details').open, true)

	assert.eq(clicked, false)
	root.querySelector('button').click()
	assert.eq(clicked, true)

	const template = handler => html`<input @blur=${handler}>Click me</input>`

	const handler = mock(_event => {})
	r.render(template(handler))
	assert.eq(handler.calls.length, 0)

	const event = new Event('blur')
	root.querySelector('input').dispatchEvent(event)
	assert.eq(handler.calls.length, 1)
	assert.eq(handler.calls[0].args[0], event)

	r.render(template(null))
	root.querySelector('input').dispatchEvent(new Event('blur'))
	assert.eq(handler.calls.length, 1)

	r.render(null)
}
