import { invalidate, onMount, type Renderable } from 'dhtml'
import { openDB, type IDBPDatabase } from 'idb'

export type ID = string

// Base entity interface all stored objects must implement
export interface Entity {
  id: ID
}

// Type-safe repository for entity CRUD operations
export class Repository<T extends Entity> {
  #db: IDBPDatabase
  #storeName: string
  #orm: ORM
  #relations: Array<
    | {
        type: 'hasMany'
        property: keyof T & string
        storeName: string
        foreignKey: string
        indexName: string
      }
    | {
        type: 'belongsTo'
        property: keyof T & string
        storeName: string
        foreignKey: keyof T & string
      }
  > = []

  constructor(db: IDBPDatabase, storeName: string, orm: ORM) {
    this.#db = db
    this.#storeName = storeName
    this.#orm = orm
  }

  // Define a one-to-many relationship
  hasMany<K extends keyof T & string>(
    property: K,
    config: {
      storeName: string
      foreignKey: string
      indexName: string
    },
  ): Repository<T> {
    this.#relations.push({
      type: 'hasMany',
      property,
      storeName: config.storeName,
      foreignKey: config.foreignKey,
      indexName: config.indexName,
    })
    return this
  }

  // Define a many-to-one relationship
  belongsTo<K extends keyof T & string, F extends keyof T & string>(
    property: K,
    config: {
      storeName: string
      foreignKey: F
    },
  ): Repository<T> {
    this.#relations.push({
      type: 'belongsTo',
      property,
      storeName: config.storeName,
      foreignKey: config.foreignKey,
    })
    return this
  }

  // Get a single entity by ID with related entities
  async get(id: ID): Promise<T | undefined> {
    const entity = (await this.#db.get(this.#storeName, id)) as T | undefined
    if (!entity) return undefined

    return this.#loadRelations(entity)
  }

  // Get all entities with their related entities
  async getAll(): Promise<T[]> {
    const entities = (await this.#db.getAll(this.#storeName)) as T[]
    return Promise.all(entities.map(entity => this.#loadRelations(entity)))
  }

  // Get entities by index value with their related entities
  async getAllByIndex(indexName: string, key: string | number): Promise<T[]> {
    const entities = (await this.#db.getAllFromIndex(this.#storeName, indexName, key)) as T[]
    return Promise.all(entities.map(entity => this.#loadRelations(entity)))
  }

  // Add a new entity
  async add(entity: T): Promise<ID> {
    const rawEntity = this.#extractRawEntity(entity)
    const id = (await this.#db.add(this.#storeName, rawEntity)) as ID
    this.#emit(`${this.#storeName}:all`, `${this.#storeName}:${id}`)
    return id
  }

  // Update an existing entity
  async update(entity: T): Promise<ID> {
    const rawEntity = this.#extractRawEntity(entity)
    const id = (await this.#db.put(this.#storeName, rawEntity)) as ID
    this.#emit(`${this.#storeName}:${id}`)
    return id
  }

  // Delete an entity
  async delete(id: ID): Promise<void> {
    await this.#db.delete(this.#storeName, id)
    this.#emit(`${this.#storeName}:all`, `${this.#storeName}:${id}`)
  }

  // Load related entities for an entity
  async #loadRelations(entity: T): Promise<T> {
    // Create a copy to avoid modifying the original
    const result = { ...entity } as T

    for (const relation of this.#relations) {
      if (relation.type === 'hasMany') {
        // Get related entities for hasMany relationship
        const related = await this.#db.getAllFromIndex(
          relation.storeName,
          relation.indexName,
          entity.id
        )
        
        // Type assertion with specific known shape
        type IdArray = Array<ID>
        const idArray = related.map((item: Entity) => item.id) as IdArray
        
        // Set the IDs list to the relation property
        // Using type assertion for assignment since TypeScript can't know
        // that the property is supposed to hold an array of IDs
        ;(result[relation.property] as unknown as IdArray) = idArray
      } else if (relation.type === 'belongsTo') {
        // Get the foreign key value
        const foreignKeyValue = entity[relation.foreignKey]
        
        // If there is a foreign key value and it's a string (ID)
        if (foreignKeyValue && typeof foreignKeyValue === 'string') {
          // Look up the related entity
          const related = await this.#db.get(relation.storeName, foreignKeyValue)
          
          // If found, set the ID to the relation property
          if (related) {
            // Using type assertion for assignment
            ;(result[relation.property] as unknown as ID) = (related as Entity).id
          }
        }
      }
    }

    return result
  }

  // Extract a raw entity for storage (removing virtual relation properties)
  #extractRawEntity(entity: T): Omit<T, keyof { [K in keyof T as T[K] extends ID[] ? K : never]: any }> {
    // Create a shallow clone of the entity
    const result = { ...entity } 

    // Remove hasMany relation properties since they're virtual
    for (const relation of this.#relations) {
      if (relation.type === 'hasMany') {
        delete (result as any)[relation.property]
      }
    }

    return result as Omit<T, keyof { [K in keyof T as T[K] extends ID[] ? K : never]: any }>
  }

  // Emit events through the ORM
  #emit(...events: string[]): void {
    this.#orm.emit(...events)
  }

  // Create a reactive query through the ORM
  createQuery<R>(renderable: Renderable, getSubscribers: () => Iterable<string>, query: () => Promise<R>) {
    return this.#orm.createQuery(renderable, getSubscribers, query)
  }
}

// Database schema configuration type
export interface StoreSchema {
  keyPath: string
  indexes?: Array<{
    name: string
    keyPath: string
    options?: IDBIndexParameters
  }>
}

// Migration definition type
export interface Migration {
  version: number
  upgrade: (db: IDBPDatabase, oldVersion: number) => void
}

// Main ORM class for managing database access
export class ORM {
  #db: IDBPDatabase
  #channel: BroadcastChannel
  #repositories = new Map<string, Repository<Entity>>()
  #listeners = new Set<(event: { data: string }) => void>()

  constructor(db: IDBPDatabase, channel: BroadcastChannel) {
    this.#db = db
    this.#channel = channel
  }

  // Get a repository for a specific entity type
  repository<T extends Entity>(storeName: string): Repository<T> {
    if (!this.#repositories.has(storeName)) {
      const repo = new Repository<T>(this.#db, storeName, this)
      this.#repositories.set(storeName, repo as unknown as Repository<Entity>)
      return repo
    }
    return this.#repositories.get(storeName) as unknown as Repository<T>
  }

  // Emit events to listeners
  emit(...events: string[]): void {
    for (const event of events) {
      this.#channel.postMessage(event)

      for (const listener of this.#listeners) {
        listener({ data: event })
      }
    }
  }

  // Create a reactive query that updates when data changes
  createQuery<R>(renderable: Renderable, getSubscribers: () => Iterable<string>, query: () => Promise<R>) {
    let value: R | null = null
    let subscribed: Set<string>

    const read = async () => {
      subscribed = new Set(getSubscribers())
      value = await query()
      invalidate(renderable)
    }

    const handler = ({ data }: { data: string }) => {
      if (subscribed.has(data)) read()
    }

    onMount(renderable, () => {
      read()
      this.#channel.addEventListener('message', handler)
      this.#listeners.add(handler)
      return () => {
        this.#channel.removeEventListener('message', handler)
        this.#listeners.delete(handler)
      }
    })

    return () => value
  }

  // Close database and channel connections
  close(): void {
    this.#db.close()
    this.#channel.close()
  }

  // Open a database with schema and migrations
  static async open(dbName: string, schema: Record<string, StoreSchema>, migrations: Migration[] = []): Promise<ORM> {
    const version = Math.max(1, ...migrations.map(m => m.version))

    const db = await openDB(dbName, version, {
      upgrade(db, oldVersion) {
        // Initial schema creation
        if (oldVersion === 0) {
          for (const [storeName, storeSchema] of Object.entries(schema)) {
            const store = db.createObjectStore(storeName, { keyPath: storeSchema.keyPath })

            for (const index of storeSchema.indexes ?? []) {
              store.createIndex(index.name, index.keyPath, index.options)
            }
          }
        } else {
          // Apply migrations for version upgrades
          for (const migration of migrations) {
            if (migration.version > oldVersion) {
              migration.upgrade(db, oldVersion)
            }
          }
        }
      },
    })

    return new ORM(db, new BroadcastChannel(dbName))
  }
}
