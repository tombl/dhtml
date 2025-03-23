import { mock, test } from 'bun:test'
import { html } from 'dhtml'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

test('regular attributes', () => {
	const { root, el } = setup()

	root.render(html`<h1 style=${'color: red'}>Hello, world!</h1>`)
	assert.equal(el.querySelector('h1')!.getAttribute('style'), 'color: red;')
})

test('can toggle attributes', () => {
	const { root, el } = setup()

	let hidden: unknown = false
	const template = () => html`<h1 hidden=${hidden}>Hello, world!</h1>`

	root.render(template())
	assert(!el.querySelector('h1')!.hasAttribute('hidden'))

	hidden = true
	root.render(template())
	assert(el.querySelector('h1')!.hasAttribute('hidden'))

	hidden = null
	root.render(template())
	assert(!el.querySelector('h1')!.hasAttribute('hidden'))
})

test('supports property attributes', () => {
	const { root, el } = setup()

	root.render(html`<details open=${true}></details>`)
	assert(el.querySelector('details')!.open)

	root.render(html`<details open=${false}></details>`)
	assert(!el.querySelector('details')!.open)
})

test('infers the case of properties', () => {
	const { root, el } = setup()

	const innerHTML = '<h1>Hello, world!</h1>'

	root.render(html`<div innerhtml=${innerHTML}></div>`)
	assert.equal(el.querySelector('div')!.innerHTML, innerHTML)

	root.render(html`<span innerHTML=${innerHTML}></span>`)
	assert.equal(el.querySelector('span')!.innerHTML, innerHTML)
})

test('treats class/for specially', () => {
	const { root, el } = setup()

	root.render(html`<h1 class=${'foo'}>Hello, world!</h1>`)
	assert.equal(el.querySelector('h1')!.className, 'foo')

	root.render(html`<label for=${'foo'}>Hello, world!</label>`)
	assert.equal(el.querySelector('label')!.htmlFor, 'foo')
})

test('handles data attributes', () => {
	const { root, el } = setup()

	root.render(html`<h1 data-foo=${'bar'}>Hello, world!</h1>`)
	assert.equal(el.querySelector('h1')!.dataset.foo, 'bar')
})

test('supports events', () => {
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

	assert.equal(clicks, 0)
	el.querySelector('button')!.click()
	assert.equal(clicks, 1)
	el.querySelector('button')!.click()
	assert.equal(clicks, 2)
})

test('supports event handlers that change', () => {
	const { root, el } = setup()

	const template = (handler: ((event: Event) => void) | null) => html`<input onblur=${handler}>Click me</input>`

	const handler = mock((_event: Event) => {})
	root.render(template(handler))
	assert.equal(handler.mock.calls.length, 0)

	const event = new Event('blur')
	el.querySelector('input')!.dispatchEvent(event)
	assert.equal(handler.mock.calls.length, 1)
	assert.equal(handler.mock.calls[0][0], event)

	root.render(template(null))
	el.querySelector('input')!.dispatchEvent(new Event('blur'))
	assert.equal(handler.mock.calls.length, 1)
})
