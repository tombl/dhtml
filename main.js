import { Root, html } from './html.js'

function ticker(controller, interval) {
	const id = setInterval(() => {
		controller.invalidate()
	}, interval)
	controller.signal.addEventListener('abort', () => {
		console.log('abort')
		clearInterval(id)
	})
}

const once = fn => {
	let done = false
	let result
	return (...args) => {
		if (!done) {
			done = true
			result = fn(...args)
		}
		return result
	}
}

class Clock {
	#start = once(controller => ticker(controller, 1000))
	render(controller) {
		this.#start(controller)
		return html`<p>${new Date().toLocaleTimeString()}</p>`
	}
}

class App {
	#clock = new Clock()
	i = 0
	render(controller) {
		if (this.i === 5) return null
		return html`
			<button
				@click=${() => {
					controller.invalidate()
				}}
			>
				Hello, ${this.i++}!
			</button>
			${this.#clock}
		`
	}
}

Root.appendInto(document.body).render(html`${new App()}`)
