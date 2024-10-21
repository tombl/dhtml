import { Root, html } from './html.js'

class BaseElement extends HTMLElement {
	#root = Root.appendInto(this.attachShadow({ mode: 'open' }))
	#abortController
	#controller
	#App
	#app

	static define(name, App) {
		customElements.define(
			name,
			class extends BaseElement {
				constructor() {
					super(App)
				}
			},
		)
	}

	constructor(App) {
		super()
		this.#App = App
		const self = this
		this.#controller = {
			get signal() {
				return self.#abortController.signal
			},
			invalidate() {
				self.#invalidate()
			},
		}
	}

	connectedCallback() {
		this.#abortController = new AbortController()
		this.#app = new this.#App(this.#controller)
		this.#invalidate()
	}
	disconnectedCallback() {
		this.#abortController.abort()
		this.#abortController = null
		this.#app = null
	}
	attributeChangedCallback() {
		this.#invalidate()
	}

	#invalidate() {
		this.#root.render(html`${this.#app}`)
	}
}

function ticker(controller, interval) {
	const id = setInterval(() => {
		controller.invalidate()
	}, interval)
	controller.signal.addEventListener('abort', () => {
		clearInterval(id)
	})
}

class App {
	#controller
	constructor(controller) {
		this.#controller = controller
		ticker(controller, 1000)
	}

	i = 0
	render() {
		const time = html`<p>Current time: ${new Date().toLocaleTimeString()}</p>`
		return html`
			<h1>Hello, ${this.i++}!</h1>
			${time}
			<button @click=${() => {
				this.#controller.invalidate()
			}}>Invalidate</button>
			`
	}
}

BaseElement.define('my-app', App)
