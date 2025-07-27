import { html } from 'dhtml'
import { createRoot } from 'dhtml/client'
import { assert, assert_eq, test } from '../../../scripts/test/test.ts'
import { setup } from './setup.ts'

test('custom elements instantiate correctly', () => {
	const { root, el } = setup()

	class CustomElement extends HTMLElement {
		#thingName?: string
		get thingName() {
			return this.#thingName
		}
		set thingName(value) {
			this.#thingName = value?.toUpperCase()
		}

		constructor() {
			super()
			this.innerText = 'inside custom element'
		}
	}

	customElements.define('custom-element', CustomElement)

	root.render(html`<custom-element thingName=${'hello'}></custom-element>`)
	assert_eq(el.innerHTML, `<custom-element>inside custom element</custom-element>`)

	const customElement = el.querySelector('custom-element') as CustomElement
	assert(customElement instanceof CustomElement)
	assert_eq(customElement.thingName, 'HELLO')
})

test('content renders into shadow dom', () => {
	const { el } = setup()
	const shadowRoot = el.attachShadow({ mode: 'open' })

	const root = createRoot(shadowRoot)
	root.render(html`<p>hello</p>`)

	assert_eq(el.innerHTML, ``)
	assert_eq(shadowRoot.innerHTML, `<p>hello</p>`)
})
