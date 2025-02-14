import { Root, html } from 'dhtml'
import { expect, test, vi } from 'vitest'

test('attributes', () => {
	const root = document.createElement('div')
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
	expect(root.querySelector('h1')!.style.color).toBe('red')
	expect(root.querySelector('h2')!.className).toBe('foo')
	expect(root.querySelector('h3')!.className).toBe('bar')
	expect(root.querySelector('details')!.open).toBe(true)

	expect(clicked).toBe(false)
	root.querySelector('button')!.click()
	expect(clicked).toBe(true)

	const template = (handler: (() => void) | null) => html`<input @blur=${handler}>Click me</input>`

	const handler = vi.fn()
	r.render(template(handler))
	expect(handler).not.toBeCalled()

	const event = new Event('blur')
	root.querySelector('input')!.dispatchEvent(event)
	expect(handler).toHaveBeenCalledExactlyOnceWith(event)

	r.render(template(null))
	root.querySelector('input')!.dispatchEvent(new Event('blur'))
	expect(handler).toHaveBeenCalledOnce()

	r.render(null)
})
