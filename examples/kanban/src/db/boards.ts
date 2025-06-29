import type { App } from '~/app'
import type { Board, ID } from '.'
import { unwrap } from './database'

export async function list(app: App) {
	const { sql } = unwrap(app.db)
	return await sql<Board>`
    select * from boards
    order by created_at desc
  `
}

export async function get(app: App, id: ID) {
	const { sql } = unwrap(app.db)
	const [board] = await sql<Board>`
    select * from boards
    where id = ${id}
  `
	return board
}

export async function create(app: App, name: string) {
	const { sql } = unwrap(app.db)
	await sql`
    insert into boards (name)
    values (${name})
  `
	app.bus.emit('boards')
}

export async function remove(app: App, id: ID) {
	const { sql } = unwrap(app.db)
	await sql`
    delete from boards
    where id = ${id}
  `
	app.bus.emit('boards')
}

export async function updateName(app: App, id: ID, name: string) {
	const { sql } = unwrap(app.db)
	await sql`
    update boards
    set name = ${name}
    where id = ${id}
  `
	app.bus.emit('boards')
}
