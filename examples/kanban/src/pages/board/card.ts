import { html } from 'dhtml'
import type { App } from '~/app'
import * as db from '~/db'
import { type Query, createSubscribedQuery } from '~/util/query'
import { text } from './text'

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
      <li class="card">
        ${text({
          value: card.title,
          onSubmit: name => {
            if (name.trim() === '') {
              db.cards.remove(this.#app, this.id)
            } else {
              db.cards.updateTitle(this.#app, this.id, name)
            }
          },
        })}
      </li>
    `
  }
}
