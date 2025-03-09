import { type Renderable } from 'dhtml'
import { ORM, Repository } from './orm'
import type { Entity, ID, StoreSchema, Migration } from './orm'

// Export ID type for other modules
export type { ID } from './orm'

// Define entity interfaces
export interface Board extends Entity {
  title: string
  createdAt: number
  columns?: ID[]
}

export interface Column extends Entity {
  boardId: ID
  title: string
  order: number
  cards?: ID[]
}

export interface Card extends Entity {
  columnId: ID
  title: string
  description: string
  order: number
  createdAt: number
}

// Database schema definition
const schema: Record<string, StoreSchema> = {
  boards: {
    keyPath: 'id',
  },
  columns: {
    keyPath: 'id',
    indexes: [{ name: 'by_board', keyPath: 'boardId' }],
  },
  cards: {
    keyPath: 'id',
    indexes: [{ name: 'by_column', keyPath: 'columnId' }],
  },
}

// Database migrations for schema changes
const migrations: Migration[] = [
  // Example migration to add a field
  // {
  //   version: 2,
  //   upgrade: (db, oldVersion) => {
  //     const transaction = db.transaction('cards', 'readwrite')
  //     const store = transaction.objectStore('cards')
  //     // Add new fields to existing records
  //   }
  // }
]

// Database access layer
export class Database {
  #orm: ORM

  boards: Repository<Board>
  columns: Repository<Column>
  cards: Repository<Card>

  constructor(orm: ORM) {
    this.#orm = orm

    // Configure repositories with relationships
    this.boards = orm.repository<Board>('boards').hasMany('columns' as keyof Board & string, {
      storeName: 'columns',
      foreignKey: 'boardId',
      indexName: 'by_board',
    })

    this.columns = orm
      .repository<Column>('columns')
      .hasMany('cards' as keyof Column & string, {
        storeName: 'cards',
        foreignKey: 'columnId',
        indexName: 'by_column',
      })
      .belongsTo('board' as keyof Column & string, {
        storeName: 'boards',
        foreignKey: 'boardId' as keyof Column & string,
      })

    this.cards = orm.repository<Card>('cards').belongsTo('column' as keyof Card & string, {
      storeName: 'columns',
      foreignKey: 'columnId' as keyof Card & string,
    })
  }

  // Create a reactive query
  createQuery<T>(
    renderable: Renderable,
    getSubscribers: () => Iterable<string>,
    query: () => Promise<T>,
  ) {
    return this.#orm.createQuery(renderable, getSubscribers, query)
  }


  close() {
    this.#orm.close()
  }

  static async open(key: ID) {
    const orm = await ORM.open(`kanban:${key}`, schema, migrations)
    return new Database(orm)
  }
}
