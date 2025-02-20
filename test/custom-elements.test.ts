import { html } from 'dhtml'
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
}

customElements.define('custom-element', CustomElement)

describe('custom elements', () => {
	it('compatible with custom elements', () => {
		const { root, el } = setup()

		root.render(html`<custom-element .thing=${'hello'}></custom-element>`)
		expect(el.innerHTML).toBe('<custom-element></custom-element>')

		const customElement = el.querySelector('custom-element') as CustomElement
		expect(customElement).toBeInstanceOf(CustomElement)
		expect(customElement.thing).toBe('HELLO')
	})
})
