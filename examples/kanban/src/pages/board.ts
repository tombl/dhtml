import { html, type Displayable } from 'dhtml'
import { nanoid } from 'nanoid'
import type { App } from '../app'
import type * as DB from '../db'

class Card {
  id: DB.ID
  #query

  constructor(app: App, id: DB.ID) {
    this.id = id

    this.#query = app.db.createQuery(
      this,
      () => [`card:${id}`],
      () => app.db.cards.get(id),
    )
  }

  render(): Displayable {
    const card = this.#query()
    return html`<div>${card ? card.title : 'Loading...'}</div>`
  }
}

class Column {
  id: DB.ID
  #query
  #cards: (Card | null)[] = []

  constructor(app: App, id: DB.ID) {
    this.id = id

    this.#query = app.db.createQuery(
      this,
      () => [`column:${id}`],
      async () => {
        const column = await app.db.columns.get(id)
        if (!column) return null

        const oldCards: Array<Card | null> = this.#cards
        this.#cards = (column.cards ?? []).map((cardId: DB.ID) => {
          const index = oldCards.findIndex(card => card?.id === cardId)
          if (index !== -1) {
            const card = oldCards[index]
            oldCards[index] = null
            return card
          }
          return new Card(app, cardId)
        })

        return column
      },
    )
  }

  render(): Displayable {
    const column = this.#query()
    if (!column) return html`<div>Loading column...</div>`
    
    return html`
      <div>
        <h3>${column.title}</h3>
        <div>
          ${this.#cards.filter(Boolean)}
        </div>
      </div>
    `
  }
}

export default class BoardPage {
  #app: App
  id: DB.ID
  #query
  #columns: (Column | null)[] = []

  constructor({ app }: { app: App }, params: { id: DB.ID }) {
    this.#app = app
    this.id = params.id

    this.#query = this.#app.db.createQuery(
      this,
      () => [`board:${this.id}`],
      async () => {
        const board = await this.#app.db.boards.get(this.id)
        if (!board) return null

        const oldColumns: Array<Column | null> = this.#columns
        this.#columns = (board.columns ?? []).map((columnId: DB.ID) => {
          const index = oldColumns.findIndex(column => column?.id === columnId)
          if (index !== -1) {
            const column = oldColumns[index]
            oldColumns[index] = null
            return column
          }
          return new Column(this.#app, columnId)
        })

        return board
      },
    )
  }

  render(): Displayable {
    const board = this.#query()
    if (!board) {
      return html`
        <div>
          <p>Loading board or board not found...</p>
          <a href="/">Back to Boards</a>
        </div>
      `
    }

    return html`
      <div>
        <header>
          <h1>${board.title}</h1>
          <a href="/">Back to Boards</a>
        </header>

        <div>
          <div>
            ${this.#columns}

            <div>
              <form
                onsubmit=${(e: SubmitEvent) => {
                  e.preventDefault()
                  const { title } = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement))
                  this.#app.db.columns.add({
                    boardId: this.id,
                    id: nanoid(),
                    order: this.#columns.length,
                    title: String(title),
                  })
                }}
              >
                <input type="text" name="title" placeholder="New column title" required />
                <button type="submit">Add Column</button>
              </form>
            </div>
          </div>
        </div>

        <style></style>
      </div>
    `
  }
}
