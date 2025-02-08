import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

class CustomElement extends HTMLElement {
	#thing
	get thing() {
		return this.#thing
	}
	set thing(value) {
		this.#thing = value.toUpperCase()
	}
}

customElements.define('custom-element', CustomElement)

test('custom-element-compat', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	r.render(html`<custom-element .thing=${'hello'}></custom-element>`)
	expect(root.firstElementChild).toBeInstanceOf(CustomElement)
	expect(root.firstElementChild.thing).toBe('HELLO')
})
