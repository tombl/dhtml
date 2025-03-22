import { html } from 'dhtml'
import { describe, expect, it, vi } from 'vitest'
import { setup } from './setup'

describe('attributes', () => {
	it('supports regular attributes', () => {
		const { root, el } = setup()

		root.render(html`<h1 style=${'color: red'}>Hello, world!</h1>`)
		expect(el.querySelector('h1')).toHaveAttribute('style', 'color: red;')
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

		root.render(html`<details open=${true}></details>`)
		expect(el.querySelector('details')!.open).toBe(true)

		root.render(html`<details open=${false}></details>`)
		expect(el.querySelector('details')!.open).toBe(false)
	})

	it('guesses the case of properties', () => {
		const { root, el } = setup()

		const innerHTML = '<h1>Hello, world!</h1>'

		root.render(html`<div innerhtml=${innerHTML}></div>`)
		expect(el.querySelector('div')!.innerHTML).toBe(innerHTML)

		root.render(html`<span innerHTML=${innerHTML}></span>`)
		expect(el.querySelector('span')!.innerHTML).toBe(innerHTML)
	})

	it('treats class/for specially', () => {
		const { root, el } = setup()

		root.render(html`<h1 class=${'foo'}>Hello, world!</h1>`)
		expect(el.querySelector('h1')).toHaveClass('foo')

		root.render(html`<label for=${'foo'}>Hello, world!</label>`)
		expect(el.querySelector('label')).toHaveAttribute('for', 'foo')
	})

	it('handles data attributes', () => {
		const { root, el } = setup()

		root.render(html`<h1 data-foo=${'bar'}>Hello, world!</h1>`)
		expect(el.querySelector('h1')).toHaveAttribute('data-foo', 'bar')
	})

	it('supports events', () => {
		const { root, el } = setup()

		let clicks = 0
		root.render(html`
			<button
				onclick=${() => {
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

		const template = (handler: (() => void) | null) => html`<input onblur=${handler}>Click me</input>`

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
