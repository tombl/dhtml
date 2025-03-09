import { SQLocal } from 'sqlocal'

export let unwrap: (database: Database) => SQLocal

export class Database {
  #db: SQLocal
  constructor() {
    this.#db = new SQLocal('db')
    this.#migrate()
  }

  static {
    unwrap = database => database.#db
  }

  async #migrate() {
    this.#db.sql`
      create table if not exists boards (
        id integer primary key autoincrement,
        name text not null,
        created_at datetime default current_timestamp
      );

      create table if not exists columns (
        id integer primary key autoincrement,
        board_id integer not null,
        name text not null,
        position integer not null,
        created_at datetime default current_timestamp,
        foreign key (board_id) references boards(id) on delete cascade
      );

      create table if not exists cards (
        id integer primary key autoincrement,
        column_id integer not null,
        title text not null,
        description text,
        position integer not null,
        created_at datetime default current_timestamp,
        foreign key (column_id) references columns(id) on delete cascade
      );

    `
  }

  async close() {
    await this.#db.destroy()
  }
}
