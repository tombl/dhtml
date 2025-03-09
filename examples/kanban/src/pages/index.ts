import { html } from 'dhtml'
import { Counter } from '../counter'

export default class IndexPage {
	#counter = new Counter()

	render() {
		return html`
			<p>home</p>
			${this.#counter}
			<p>
				<a href="/greet/foo">greet foo</a>
			</p>
		`
	}
}
