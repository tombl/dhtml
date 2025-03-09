import { invalidate, onMount, type Renderable } from 'dhtml'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface SchemaV1 extends DBSchema {
  boards: {
    key: string
    value: {
      id: string
      title: string
      createdAt: number
    }
  }
  columns: {
    key: string
    value: {
      id: string
      boardId: string
      title: string
      order: number
    }
    indexes: { by_board: string }
  }
  cards: {
    key: string
    value: {
      id: string
      columnId: string
      title: string
      description: string
      order: number
      createdAt: number
    }
    indexes: { by_column: string }
  }
}

type Schema = SchemaV1
const CURRENT_VERSION = 1

export type Board = Schema['boards']['value']
export type Column = Schema['columns']['value']
export type Card = Schema['cards']['value']

type Event = 'boards' | `board:${string}`

export class Database {
  #db: IDBPDatabase<Schema>
  #channel: BroadcastChannel
  constructor(db: IDBPDatabase<Schema>, channel: BroadcastChannel) {
    this.#db = db
    this.#channel = channel
  }

  close() {
    this.#db.close()
    this.#channel.close()
  }

  static async open(key: string) {
    return new Database(
      await openDB(`kanban:${key}`, CURRENT_VERSION, {
        upgrade(db, oldVersion) {
          switch (oldVersion) {
            case 0: {
              db.createObjectStore('boards', { keyPath: 'id' })

              const columns = db.createObjectStore('columns', { keyPath: 'id' })
              columns.createIndex('by_board', 'boardId')

              const cards = db.createObjectStore('cards', { keyPath: 'id' })
              cards.createIndex('by_column', 'columnId')
            }
          }
        },
      }),
      new BroadcastChannel(`kanban:${key}`),
    )
  }

  createQuery<T>(renderable: Renderable, query: (subscribe: (event: Event) => void) => Promise<T>) {
    let value: T | null = null
    let subscribed: Set<string>

    async function read() {
      subscribed = new Set()
      value = await query(event => {
        subscribed.add(event)
      })
    }

    async function handler({ data }: MessageEvent) {
      if (subscribed.has(data)) {
        await read()
        invalidate(renderable)
      }
    }

    onMount(renderable, () => {
      read()
      this.#channel.addEventListener('message', handler)
      return () => {
        this.#channel.removeEventListener('message', handler)
      }
    })

    return () => value
  }

  async getBoards(): Promise<Board[]> {
    return this.#db.getAll('boards')
  }

  async getBoard(id: string): Promise<Board | undefined> {
    return this.#db.get('boards', id)
  }

  async addBoard(board: Board): Promise<string> {
    const id = await this.#db.add('boards', board)
    this.#channel.postMessage(`board:${id}` satisfies Event)
    return id
  }

  async updateBoard(board: Board): Promise<string> {
    const id = await this.#db.put('boards', board)
    this.#channel.postMessage(`board:${id}` satisfies Event)
    return id
  }

  async deleteBoard(id: string): Promise<void> {
    await this.#db.delete('boards', id)
    this.#channel.postMessage(`board:${id}` satisfies Event)
  }
}
