import { test } from 'bun:test'
import { html } from 'dhtml'
import { createRoot } from 'dhtml/client'
import assert from 'node:assert/strict'
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

test('custom elements instantiate correctly', () => {
	const { root, el } = setup()

	root.render(html`<custom-element thing=${'hello'}></custom-element>`)
	assert.equal(el.innerHTML, `<custom-element>inside custom element</custom-element>`)

	const customElement = el.querySelector('custom-element') as CustomElement
	assert(customElement instanceof CustomElement)
	assert.equal(customElement.thing, 'HELLO')
})

test('content renders into shadow dom', () => {
	const { el } = setup()
	const shadowRoot = el.attachShadow({ mode: 'open' })

	const root = createRoot(shadowRoot)
	root.render(html`<p>hello</p>`)

	assert.equal(el.innerHTML, ``)
	assert.equal(shadowRoot.innerHTML, `<p>hello</p>`)
})
