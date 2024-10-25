import { Root, html } from '../html.js'
import { assert } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

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

	r.render(html`<custom-element .thing=${'hello'}></custom-element>`)
	assert(root.firstElementChild instanceof CustomElement)
	assert.eq(root.firstElementChild.thing, 'HELLO')
}
