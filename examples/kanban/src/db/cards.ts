import type { App } from '#app'
import { unwrap } from './database.ts'
import type { Card, ID } from './index.ts'

export async function list(app: App, columnId: ID) {
	const { sql } = unwrap(app.db)
	return await sql<{ id: ID }>`
    select id from cards
    where column_id = ${columnId}
    order by position asc
  `
}

export async function get(app: App, id: ID) {
	const { sql } = unwrap(app.db)
	const [card] = await sql<Card>`
    select * from cards
    where id = ${id}
  `
	return card
}

export async function create(app: App, columnId: ID, title: string) {
	const { sql } = unwrap(app.db)
	const [{ max }] = await sql<{ max: number }>`
    select max(position) as max from cards
    where column_id = ${columnId}
  `
	const position = (max ?? -1) + 1
	await sql`
    insert into cards (column_id, title, position)
    values (${columnId}, ${title}, ${position})
  `
	app.bus.emit(`column:${columnId}:cards`)
}

export async function remove(app: App, id: ID) {
	const { sql } = unwrap(app.db)
	const [{ column_id }] = await sql<{ column_id: ID }>`
    select column_id from cards
    where id = ${id}
  `
	await sql`
    delete from cards
    where id = ${id}
  `
	app.bus.emit(`column:${column_id}:cards`)
}

export async function updateTitle(app: App, id: ID, title: string) {
	const { sql } = unwrap(app.db)
	await sql`
    update cards
    set title = ${title}
    where id = ${id}
  `
	app.bus.emit(`card:${id}`)
}
