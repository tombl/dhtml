export type ID = number & { __id: never }

export interface Board {
  id: ID
  name: string
  created_at: number
}

export interface Column {
  id: ID
  board_id: ID
  name: string
  position: number
  created_at: number
}

export interface Card {
  id: ID
  column_id: ID
  title: string
  description: string | null
  position: number
  created_at: number
}

export * as boards from './boards'
export * as cards from './cards'
export * as columns from './columns'

export { Database } from './database'
