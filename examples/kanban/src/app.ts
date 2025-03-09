import { html } from 'dhtml'
import { Router } from './router'

export class App {
	#router = new Router({
		'/': () => import('./pages/index'),
		'/greet/:name': () => import('./pages/greet'),
	})

	render() {
		return html`
			<h1>App</h1>
			<main>${this.#router}</main>
		`
	}
}
