import { SQLocal } from 'sqlocal'

export let unwrap: (database: Database) => SQLocal

export class Database {
  #db: SQLocal
  constructor() {
    this.#db = new SQLocal(':memory:')
    this.#migrate()
  }

  static {
    unwrap = database => database.#db
  }

  async #migrate() {
    this.#db.sql`
      create table boards (
        id integer primary key autoincrement,
        name text not null,
        created_at datetime default current_timestamp
      );

      create table columns (
        id integer primary key autoincrement,
        board_id integer not null,
        name text not null,
        position integer not null,
        created_at datetime default current_timestamp,
        foreign key (board_id) references boards(id) on delete cascade
      );

      create table cards (
        id integer primary key autoincrement,
        column_id integer not null,
        title text not null,
        description text,
        position integer not null,
        created_at datetime default current_timestamp,
        foreign key (column_id) references columns(id) on delete cascade
      );

      insert into boards (id, name) values (1, 'The Board');

      insert into columns (board_id, name, position)
      values (1, 'Todo', 0),
             (1, 'In Progress', 1),
             (1, 'Done', 2);

      insert into cards (column_id, title, position)
      values (1, 'Card 1', 0),
             (1, 'Card 2', 1),
             (2, 'Card 3', 0),
             (3, 'Card 4', 0);

    `
  }

  async close() {
    await this.#db.destroy()
  }
}
