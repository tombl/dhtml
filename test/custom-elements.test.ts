import { html, Root } from 'dhtml'
import { expect, describe, it } from 'vitest'
import { setup } from './setup'

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

describe('custom elements', () => {
	it('correctly instantiates custom elements', () => {
		const { root, el } = setup()

		root.render(html`<custom-element .thing=${'hello'}></custom-element>`)
		expect(el.innerHTML).toBe(`<custom-element>inside custom element</custom-element>`)

		const customElement = el.querySelector('custom-element') as CustomElement
		expect(customElement).toBeInstanceOf(CustomElement)
		expect(customElement.thing).toBe('HELLO')
	})

	it('renders into shadow dom', () => {
		const { el } = setup()
		const shadowRoot = el.attachShadow({ mode: 'open' })

		const root = Root.appendInto(shadowRoot)
		root.render(html`<p>hello</p>`)

		expect(el.innerHTML).toBe(``)
		expect(shadowRoot.innerHTML).toBe(`<p>hello</p>`)
	})
})
