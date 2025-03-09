import type { App } from '~/app.ts'
import { unwrap } from './database.ts'
import type { Column, ID } from './index.ts'

export async function list(app: App, boardId: ID) {
  const { sql } = unwrap(app.db)
  return await sql<{ id: ID }>`
    select id from columns
    where board_id = ${boardId}
    order by position asc
  `
}

export async function get(app: App, id: ID) {
  const { sql } = unwrap(app.db)
  const [column] = await sql<Column>`
    select * from columns
    where id = ${id}
  `
  return column
}

export async function create(app: App, boardId: ID, name: string) {
  const { sql } = unwrap(app.db)
  const [{ max }] = await sql<{ max: number }>`
    select max(position) as max from columns
    where board_id = ${boardId}
  `
  const position = (max ?? -1) + 1
  await sql`
    insert into columns (board_id, name, position)
    values (${boardId}, ${name}, ${position})
  `
  app.bus.emit(`board:${boardId}:columns`)
}

export async function remove(app: App, id: ID) {
  const { sql } = unwrap(app.db)
  const [{ board_id }] = await sql<{ board_id: ID }>`
    select board_id from columns
    where id = ${id}
  `
  await sql`
    delete from columns
    where id = ${id}
  `
  app.bus.emit(`board:${board_id}:columns`)
}

export async function updateName(app: App, id: ID, name: string) {
  const { sql } = unwrap(app.db)
  await sql`
    update columns
    set name = ${name}
    where id = ${id}
  `
  app.bus.emit(`column:${id}`)
}
