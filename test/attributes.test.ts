import { html } from 'dhtml'
import { describe, expect, it, vi } from 'vitest'
import { setup } from './setup'

describe('attributes', () => {
	it('supports regular attributes', () => {
		const { root, el } = setup()

		root.render(html`<h1 style=${'color: red'}>Hello, world!</h1>`)
		expect(el.querySelector('h1')).toHaveAttribute('style', 'color: red')
	})

	it('can toggle attributes', () => {
		const { root, el } = setup()

		let hidden: unknown = false
		const template = () => html`<h1 hidden=${hidden}>Hello, world!</h1>`

		root.render(template())
		expect(el.querySelector('h1')).not.toHaveAttribute('hidden')

		hidden = true
		root.render(template())
		expect(el.querySelector('h1')).toHaveAttribute('hidden')

		hidden = null
		root.render(template())
		expect(el.querySelector('h1')).not.toHaveAttribute('hidden')
	})

	it('supports property attributes', () => {
		const { root, el } = setup()

		root.render(html`<h1 .class-name=${'foo'}>Hello, world!</h1>`)
		expect(el.querySelector('h1')).toHaveClass('foo')
	})

	it('throws on property attributes without dynamic values', () => {
		const { root } = setup()

		expect(() => {
			root.render(html`<h1 .class-name="bar">This also</h1>`)
		}).toThrowErrorMatchingInlineSnapshot(
			`[Error: static properties are not supported, please wrap the value of .class-name in \${...}]`,
		)
	})

	it('supports booleans', () => {
		const { root, el } = setup()

		root.render(html`<details open=${true}></details>`)
		expect(el.querySelector('details')?.open).toBe(true)
	})

	it('supports events', () => {
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

	it('supports event handlers that change', () => {
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
