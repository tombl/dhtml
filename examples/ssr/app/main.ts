import { html } from 'dhtml'
import { hydrate, invalidate } from 'dhtml/client'

export const app = {
	count: 0,
	render() {
		return html`
			<main>
				<div>Hello, world!</div>
				<button
					onclick=${() => {
						this.count++
						invalidate(this)
					}}
				>
					${this.count}
				</button>
			</main>
		`
	},
}

if (typeof window !== 'undefined') {
	hydrate(document.body, app)
}
