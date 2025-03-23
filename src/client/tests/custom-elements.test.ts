import { html } from 'dhtml'
import { createRoot } from 'dhtml/client'
import test, { type TestContext } from 'node:test'
import { setup } from './setup.ts'

class CustomElement extends HTMLElement {
	#thing?: string
	get thing() {
		return this.#thing
	}
	set thing(value) {
		this.#thing = value?.toUpperCase()
	}

	constructor() {
		super()
		this.innerText = 'inside custom element'
	}
}

customElements.define('custom-element', CustomElement)

test('custom elements instantiate correctly', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<custom-element thing=${'hello'}></custom-element>`)
	t.assert.strictEqual(el.innerHTML, `<custom-element>inside custom element</custom-element>`)

	const customElement = el.querySelector('custom-element') as CustomElement
	t.assert.ok(customElement instanceof CustomElement)
	t.assert.strictEqual(customElement.thing, 'HELLO')
})

test('content renders into shadow dom', (t: TestContext) => {
	const { el } = setup()
	const shadowRoot = el.attachShadow({ mode: 'open' })

	const root = createRoot(shadowRoot)
	root.render(html`<p>hello</p>`)

	t.assert.strictEqual(el.innerHTML, ``)
	t.assert.strictEqual(shadowRoot.innerHTML, `<p>hello</p>`)
})
