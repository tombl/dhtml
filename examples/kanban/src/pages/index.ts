import type { App, PageContext } from '#app'
import * as db from '#db'
import { type Query, createSubscribedQuery } from '#util/query.ts'
import { html } from 'dhtml'

export default class Page {
	#app: App
	#boards: Query<db.Board[]>

	constructor({ app }: PageContext) {
		this.#app = app
		this.#boards = createSubscribedQuery(this, app.bus, 'boards', () => db.boards.list(app))
	}

	render() {
		const boards = this.#boards()

		return html`
			<div>
				<h1>Kanban Boards</h1>

				<form
					onsubmit=${async (e: Event) => {
						e.preventDefault()
						const form = e.currentTarget as HTMLFormElement
						const formData = new FormData(form)

						const name = String(formData.get('name'))
						await db.boards.create(this.#app, name)

						form.reset()
					}}
				>
					<input type="text" name="name" placeholder="Enter board name" required />
					<button type="submit">Create Board</button>
				</form>

				${boards.length === 0
					? html`<p>No boards yet. Create your first board above.</p>`
					: html`
							<ul>
								${boards.map(
									board => html`
										<li>
											<a href=${`/boards/${board.id}`}>${board.name}</a>
											<button
												onclick=${() => {
													db.boards.remove(this.#app, board.id)
												}}
											>
												Delete
											</button>
										</li>
									`,
								)}
							</ul>
						`}
			</div>
		`
	}
}
