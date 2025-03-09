import { html, invalidate } from 'dhtml'

export class Counter {
	#count = 0

	render() {
		return html`
			<p>Count: ${this.#count}</p>
			<button
				onclick=${() => {
					this.#count++
					invalidate(this)
				}}
			>
				+
			</button>
		`
	}
}
