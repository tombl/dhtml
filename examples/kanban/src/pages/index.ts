import { html, type Displayable } from 'dhtml'
import { nanoid } from 'nanoid'
import type { App } from '../app'

export default class IndexPage {
  #boards
  #app: App

  constructor({ app }: { app: App }) {
    this.#app = app
    this.#boards = app.db.createQuery(
      this,
      () => ['boards'],
      () => app.db.boards.getAll(),
    )
  }

  render(): Displayable {
    const boards = this.#boards() || []

    return html`
      <div>
        <h1>Kanban Boards</h1>

        <form
          onsubmit=${async (e: Event) => {
            e.preventDefault()
            const form = e.currentTarget as HTMLFormElement
            const formData = new FormData(form)

            await this.#app.db.boards.add({
              id: nanoid(),
              title: String(formData.get('title')).trim(),
              createdAt: Date.now(),
            })

            form.reset()
          }}
        >
          <input type="text" name="title" placeholder="Enter board title" required />
          <button type="submit">Create Board</button>
        </form>

        ${boards.length === 0
          ? html`<p>No boards yet. Create your first board above.</p>`
          : html`
              <ul>
                ${boards.map(
                  board => html`
                    <li>
                      <a href=${`/boards/${board.id}`}>${board.title}</a>
                      <button
                        onclick=${() => {
                          this.#app.db.boards.delete(board.id)
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
