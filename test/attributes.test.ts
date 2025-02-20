import { html } from 'dhtml'
import { describe, expect, it, vi } from 'vitest'
import { setup } from './setup'

describe('attributes', () => {
	it('supports regular attributes', async () => {
		const { root, el } = setup()

		root.render(html`<h1 style=${'color: red'}>Hello, world!</h1>`)
		expect(el.querySelector('h1')).toHaveAttribute('style', 'color: red')
	})

	it('supports properties attributes', async () => {
		const { root, el } = setup()

		root.render(html`<h1 .class-name=${'foo'}>Hello, world!</h1>`)
		expect(el.querySelector('h1')).toHaveClass('foo')
	})

	it('supports booleans', async () => {
		const { root, el } = setup()

		root.render(html`<details open=${true}></details>`)
		expect(el.querySelector('details')?.open).toBe(true)
	})

	it('supports events', async () => {
		const { root, el } = setup()

		let clicks = 0
		root.render(html`
			<button
				@click=${() => {
					clicks++
				}}
			>
				Click me
			</button>
		`)

		expect(clicks).toBe(0)
		el.querySelector('button')!.click()
		expect(clicks).toBe(1)
		el.querySelector('button')!.click()
		expect(clicks).toBe(2)
	})

	it('supports event handlers that change', async () => {
		const { root, el } = setup()

		const template = (handler: (() => void) | null) => html`<input @blur=${handler}>Click me</input>`

		const handler = vi.fn()
		root.render(template(handler))
		expect(handler).not.toBeCalled()

		const event = new Event('blur')
		el.querySelector('input')!.dispatchEvent(event)
		expect(handler).toHaveBeenCalledExactlyOnceWith(event)

		root.render(template(null))
		el.querySelector('input')!.dispatchEvent(new Event('blur'))
		expect(handler).toHaveBeenCalledOnce()
	})
})
