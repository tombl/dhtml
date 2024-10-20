import { Root, html } from './html.js'

class BaseElement extends HTMLElement {
	#root = new Root(this.attachShadow({ mode: 'open', serializable: true }))
	#controller
	/** @type {Component} */ #component

	static create(TheComponent) {
		if (TheComponent.prototype === undefined || !('render' in TheComponent.prototype)) {
			const render = TheComponent
			TheComponent = class extends Component {
				render = render
			}
		}

		class ComponentElement extends this {
			constructor() {
				super()
				const self = this
				this.#component = new TheComponent({
					el: self,
					get signal() {
						return self.#controller?.signal
					},
					invalidate() {
						self.#invalidate()
					},
				})
			}
		}
		Object.defineProperty(ComponentElement, 'name', { value: Component.name })
		return ComponentElement
	}

	#invalidate() {
		this.#root.render(this.#component.render())
	}

	connectedCallback() {
		this.#controller = new AbortController()
		this.#invalidate()
	}
	disconnectedCallback() {
		this.#controller.abort()
		this.#controller = null
	}

	attributeChangedCallback() {
		this.#invalidate()
	}
}

class Component {
	static define(name, Component) {
		customElements.define(name, BaseElement.create(Component))
	}

	#ext

	constructor(ext) {
		this.#ext = ext
	}

	/** @type {BaseElement} */
	get el() {
		return this.#ext.el
	}

	/** @type {AbortSignal} */
	get signal() {
		return this.#ext.signal
	}

	/** @type {() => void} */
	get invalidate() {
		return this.#ext.invalidate
	}
}

Component.define(
	'app-main',
	class extends Component {
		i = this.el.hasAttribute('initial') ? parseInt(this.el.getAttribute('initial')) : 0

		render() {
			const timeout = setTimeout(this.invalidate, 1000)
			this.signal.addEventListener('abort', () => clearTimeout(timeout))
			return html`
        <h1>Hello, ${this.i++}!</h1>
        <p>Current time: ${new Date().toLocaleTimeString()}</p>
        <p>Even or odd? ${this.i % 2 === 0 ? 'Even' : 'Odd'}</p>
      `
		}
	},
)

Component.define(
	'app-button',
	() =>
		html`<button @click=${() => {
			console.log('Clicked!')
		}}>Click me</button>`,
)
