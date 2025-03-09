import { html } from 'dhtml'
import type { App } from '~/app'
import * as db from '~/db'
import { type Query, createSubscribedQuery } from '~/util/query'
import { createRecycler } from '~/util/recycle'
import { Card } from './card'
import { text } from './text'

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
      <h2>
        ${text({
          value: this.#column().name,
          onSubmit: name => db.columns.updateName(this.#app, this.id, name),
        })}
      </h2>
      <ul>
        ${this.#cards().map(card => html`<li>${card}</li>`)}
        <li>
          <button onclick=${() => db.cards.create(this.#app, this.id, 'Card')}>+</button>
        </li>
      </ul>
    `
  }
}
