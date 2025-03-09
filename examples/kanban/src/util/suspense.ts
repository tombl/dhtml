const results = new WeakMap<
  Promise<unknown>,
  { state: 'attached' } | { state: 'resolved'; value: unknown } | { state: 'rejected'; error: unknown }
>()

export function suspend<T>(promise: Promise<T>): T {
  const result = results.get(promise)
  switch (result?.state) {
    case undefined:
      results.set(promise, { state: 'attached' })
      throw promise.then(
        value => results.set(promise, { state: 'resolved', value }),
        error => results.set(promise, { state: 'rejected', error }),
      )
    case 'attached':
      throw promise
    case 'resolved':
      return result.value as T
    case 'rejected':
      throw result.error
  }
}
