import type { App } from '#app'
import * as db from '#db'
import { type Query, createSubscribedQuery } from '#util/query.ts'
import { createRecycler } from '#util/recycle.ts'
import { html } from 'dhtml'
import { Card } from './card'
import { textInput } from './text'

export class Column {
	id: db.ID
	#app: App

	#column: Query<db.Column>
	#cards: Query<Card[]>

	constructor(app: App, id: db.ID) {
		this.id = id
		this.#app = app

		this.#column = createSubscribedQuery(this, app.bus, `column:${id}`, () => db.columns.get(app, id))
		this.#cards = createSubscribedQuery(
			this,
			app.bus,
			`column:${id}:cards`,
			createRecycler(
				() => db.cards.list(app, id),
				id => new Card(app, id),
			),
		)
	}

	render() {
		return html`
			<li class="column">
				<header>
					<h2>
						${textInput({
							value: this.#column().name,
							onSubmit: name => db.columns.updateName(this.#app, this.id, name),
						})}
					</h2>
					<button onclick=${() => db.columns.remove(this.#app, this.id)}>×</button>
				</header>
				<ul
					class="cards"
					ondragover=${(e: DragEvent) => {
						e.preventDefault()

						for (const el of document.querySelectorAll('.dropping-below, .dropping-above')) {
							el.classList.remove('dropping-below', 'dropping-above')
						}

						const cardId = e.dataTransfer?.getData('application/x-kanban-card')
						const dropInfo = this.#getDragAfterElement(e.currentTarget as HTMLElement, e.clientY)
						if (!dropInfo) return

						// Don't show drop indicator if trying to drop on itself
						if (dropInfo.element.dataset.cardId === cardId) return

						if (dropInfo.position === 'before') {
							dropInfo.element.classList.add('dropping-above')
						} else {
							dropInfo.element.classList.add('dropping-below')
						}
					}}
					ondrop=${(e: DragEvent) => {
						e.preventDefault()
						const cardId = e.dataTransfer?.getData('application/x-kanban-card')
						if (!cardId) return

						// Find the closest card element to determine drop position
						const dropInfo = this.#getDragAfterElement(e.currentTarget as HTMLElement, e.clientY)

						// Don't allow dropping on itself
						if (dropInfo && dropInfo.element.dataset.cardId === cardId) return

						console.log(
							'Drop card',
							cardId,
							'in column',
							this.id,
							dropInfo ? `${dropInfo.position} element ${dropInfo.element.dataset.cardId}` : 'at end',
						)

						// TODO: Move card to this column at the determined position
					}}
				>
					${this.#cards()}
				</ul>
				<footer>
					<button onclick=${() => db.cards.create(this.#app, this.id, 'Card')}>+</button>
				</footer>
			</li>
		`
	}

	#getDragAfterElement(container: HTMLElement, y: number) {
		const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')] as HTMLElement[]

		// Find the element we're hovering over
		for (const child of draggableElements) {
			const box = child.getBoundingClientRect()
			if (y >= box.top && y <= box.bottom) {
				const middleY = box.top + box.height / 2
				return {
					element: child,
					position: y < middleY ? 'before' : 'after',
				}
			}
		}

		// If not hovering over any element, find the closest one
		const closest = draggableElements.reduce(
			(closest, child) => {
				const box = child.getBoundingClientRect()
				const offset = y - box.top - box.height / 2

				if (offset < 0 && offset > closest.offset) {
					return { offset: offset, element: child }
				} else {
					return closest
				}
			},
			{ offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null },
		)

		return closest.element ? { element: closest.element, position: 'before' as const } : null
	}
}
