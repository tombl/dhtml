import { html, type Displayable } from 'dhtml'
import type { App } from '../app'

export default class IndexPage {
  #boards

  constructor({ app }: { app: App }) {
    this.#boards = app.db.createQuery(this, subscribe => {
      subscribe('boards')
      return app.db.getBoards()
    })
  }

  render(): Displayable {
    return html`
      <h1>Boards</h1>
      <ul>
        ${this.#boards()?.map(
          board => html`
            <li>
              <a href=${`/boards/${board.id}`}>${board.title}</a>
            </li>
          `,
        )}
      </ul>
    `
  }
}
