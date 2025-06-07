import type { App } from '#app'
import * as db from '#db'
import { type Query, createSubscribedQuery } from '#util/query.ts'
import { html } from 'dhtml'
import { textInput } from './text'

export class Card {
	id: db.ID
	#app: App

	#card: Query<db.Card>

	constructor(app: App, id: db.ID) {
		this.id = id
		this.#app = app
		this.#card = createSubscribedQuery(this, app.bus, `card:${id}`, () => db.cards.get(app, id))
	}

	render() {
		const card = this.#card()
		return html`
			<li
				class="card"
				draggable="true"
				style="display: flex; align-items: center; gap: 8px;"
				ondragstart=${(e: DragEvent) => {
					// if you're trying to select something inside the input,
					// cancel the drag.
					const focused = document.activeElement
					const self = e.currentTarget as HTMLElement
					if (focused?.tagName === 'INPUT' && self.contains(focused)) {
						e.preventDefault()
					}
				}}
			>
				<div style="flex: 1;">
					${textInput({
						value: card.title,
						onSubmit: name => {
							if (name.trim() === '') {
								db.cards.remove(this.#app, this.id)
							} else {
								db.cards.updateTitle(this.#app, this.id, name)
							}
						},
					})}
				</div>
				<div
					class="drag-handle"
					style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; padding: 10px; cursor: grab;"
				>
					<div style="width: 3px; height: 3px; background: currentColor; opacity: 50%; border-radius: 50%;"></div>
					<div style="width: 3px; height: 3px; background: currentColor; opacity: 50%; border-radius: 50%;"></div>
					<div style="width: 3px; height: 3px; background: currentColor; opacity: 50%; border-radius: 50%;"></div>
					<div style="width: 3px; height: 3px; background: currentColor; opacity: 50%; border-radius: 50%;"></div>
					<div style="width: 3px; height: 3px; background: currentColor; opacity: 50%; border-radius: 50%;"></div>
					<div style="width: 3px; height: 3px; background: currentColor; opacity: 50%; border-radius: 50%;"></div>
				</div>
			</li>
		`
	}
}
