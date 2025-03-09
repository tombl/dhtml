import { html } from 'dhtml'

export default class GreetPage {
	#name: string
	constructor({ name }: { name: string }) {
		this.#name = name
	}

	render() {
		return html`hello ${this.#name}`
	}
}
