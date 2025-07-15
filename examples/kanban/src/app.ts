import './styles.css'

import { html } from 'dhtml'
import { Database, type ID } from './db'
import { Bus } from './util/bus'
import { Router } from './util/router'

type BusEvent = 'boards' | `board:${ID}:columns` | `column:${ID}` | `column:${ID}:cards` | `card:${ID}`

export interface PageContext {
	app: App
}

export class App {
	router = new Router({
		routes: {
			'/': () => import('./pages/index'),
			'/boards/:id': () => import('./pages/board'),
		},
		context: { app: this } satisfies PageContext,
	})
	bus = new Bus<BusEvent>('app')
	db = new Database()

	async stop() {
		this.router.stop()
		this.bus.close()
		await this.db.close()
	}

	render() {
		return html`<main>${this.router}</main>`
	}
}
