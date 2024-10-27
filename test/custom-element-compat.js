import { Root, html } from '../html.js'
import { assert } from './_lib.js'

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

export default root => {
	const r = Root.appendInto(root)

	r.render(html`<custom-element .thing=${'hello'}></custom-element>`)
	assert(root.firstElementChild instanceof CustomElement)
	assert.eq(root.firstElementChild.thing, 'HELLO')
}
