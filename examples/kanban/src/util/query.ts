import { invalidate, onMount, type Renderable } from 'dhtml'
import type { Bus } from './bus'
import { suspend } from './suspense'

export interface Query<T> {
  (): T
  revalidate(): void
}

type QueryFn<T> = (prev: T | null) => Promise<T>

export function createQuery<T>(renderable: Renderable, fn: QueryFn<T>): Query<T> {
  let value: T | null = null
  let promise = handle()

  async function handle() {
    value = await fn(value)
    invalidate(renderable)
    return value
  }

  function query() {
    return suspend(renderable, promise)
  }

  query.revalidate = () => {
    promise = handle()
  }

  return query
}

export function createSubscribedQuery<T, Event extends string>(
  renderable: Renderable,
  bus: Bus<Event>,
  event: Event,
  fn: QueryFn<T>,
): Query<T> {
  const query = createQuery(renderable, fn)
  onMount(renderable, () => bus.subscribe(event, query.revalidate))
  return query
}
