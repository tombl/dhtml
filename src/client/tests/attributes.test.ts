import { html } from 'dhtml'
import test, { type TestContext } from 'node:test'
import { setup } from './setup.ts'

test('regular attributes', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<h1 style=${'color: red'}>Hello, world!</h1>`)
	t.assert.strictEqual(el.querySelector('h1')!.getAttribute('style'), 'color: red;')
})

test('can toggle attributes', (t: TestContext) => {
	const { root, el } = setup()

	let hidden: unknown = false
	const template = () => html`<h1 hidden=${hidden}>Hello, world!</h1>`

	root.render(template())
	t.assert.ok(!el.querySelector('h1')!.hasAttribute('hidden'))

	hidden = true
	root.render(template())
	t.assert.ok(el.querySelector('h1')!.hasAttribute('hidden'))

	hidden = null
	root.render(template())
	t.assert.ok(!el.querySelector('h1')!.hasAttribute('hidden'))
})

test('supports property attributes', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<details open=${true}></details>`)
	t.assert.ok(el.querySelector('details')!.open)

	root.render(html`<details open=${false}></details>`)
	t.assert.ok(!el.querySelector('details')!.open)
})

test('infers the case of properties', (t: TestContext) => {
	const { root, el } = setup()

	const innerHTML = '<h1>Hello, world!</h1>'

	root.render(html`<div innerhtml=${innerHTML}></div>`)
	t.assert.strictEqual(el.querySelector('div')!.innerHTML, innerHTML)

	root.render(html`<span innerHTML=${innerHTML}></span>`)
	t.assert.strictEqual(el.querySelector('span')!.innerHTML, innerHTML)
})

test('treats class/for specially', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<h1 class=${'foo'}>Hello, world!</h1>`)
	t.assert.strictEqual(el.querySelector('h1')!.className, 'foo')

	root.render(html`<label for=${'foo'}>Hello, world!</label>`)
	t.assert.strictEqual(el.querySelector('label')!.htmlFor, 'foo')
})

test('handles data attributes', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<h1 data-foo=${'bar'}>Hello, world!</h1>`)
	t.assert.strictEqual(el.querySelector('h1')!.dataset.foo, 'bar')
})

test('supports events', (t: TestContext) => {
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

	t.assert.strictEqual(clicks, 0)
	el.querySelector('button')!.click()
	t.assert.strictEqual(clicks, 1)
	el.querySelector('button')!.click()
	t.assert.strictEqual(clicks, 2)
})

test('supports event handlers that change', (t: TestContext) => {
	const { root, el } = setup()

	const template = (handler: (() => void) | null) => html`<input onblur=${handler}>Click me</input>`

	const handler = t.mock.fn()
	root.render(template(handler))
	t.assert.strictEqual(handler.mock.callCount(), 0)

	const event = new Event('blur')
	el.querySelector('input')!.dispatchEvent(event)
	t.assert.strictEqual(handler.mock.callCount(), 1)
	t.assert.strictEqual(handler.mock.calls[0].arguments[0], event)

	root.render(template(null))
	el.querySelector('input')!.dispatchEvent(new Event('blur'))
	t.assert.strictEqual(handler.mock.callCount(), 1)
})
