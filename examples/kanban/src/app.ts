import './styles.css'

import { html, onUnmount } from 'dhtml'
import { Database } from './db'
import { Router } from './router'

export class App {
  #router = new Router({
    routes: {
      '/': () => import('./pages/index'),
      '/boards/:id': () => import('./pages/board'),
    },
    context: { app: this },
  })
  db: Database

  constructor(db: Database) {
    this.db = db
    onUnmount(this, () => db.close())
  }

  static async create() {
    const db = await Database.open('app')
    return new App(db)
  }

  render() {
    return html`<main>${this.#router}</main>`
  }
}
