import type { App } from '#app'
import * as db from '#db'
import { type Query, createSubscribedQuery } from '#util/query.ts'
import { createRecycler } from '#util/recycle.ts'
import { html } from 'dhtml'
import { Column } from './column'
import { text } from './text'

export class Board {
	id: db.ID
	#app: App

	#board: Query<db.Board>
	#columns: Query<Column[]>

	constructor(app: App, id: db.ID) {
		this.id = id
		this.#app = app

		this.#board = createSubscribedQuery(this, app.bus, 'boards', () => db.boards.get(app, this.id))
		this.#columns = createSubscribedQuery(
			this,
			app.bus,
			`board:${this.id}:columns`,
			createRecycler(
				() => db.columns.list(app, this.id),
				id => new Column(app, id),
			),
		)
	}

	render() {
		return html`
			<h1>
				${text({
					value: this.#board().name,
					onSubmit: name => db.boards.updateName(this.#app, this.id, name),
				})}
			</h1>
			<ul class="columns">
				${this.#columns()}
				<li>
					<button
						onclick=${() => {
							db.columns.create(this.#app, this.id, 'Column')
						}}
					>
						+
					</button>
				</li>
			</ul>
		`
	}
}
