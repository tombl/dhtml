import { html, type Renderable } from 'dhtml'
import { invalidate } from 'dhtml/client'

const results = new WeakMap<
	Promise<unknown>,
	{ state: 'attached' } | { state: 'resolved'; value: unknown } | { state: 'rejected'; error: unknown }
>()

export function suspend<T>(renderable: Renderable, promise: Promise<T>): T {
	const result = results.get(promise)
	switch (result?.state) {
		case undefined:
			results.set(promise, { state: 'attached' })
			promise
				.then(
					value => results.set(promise, { state: 'resolved', value }),
					error => results.set(promise, { state: 'rejected', error }),
				)
				.then(() => invalidate(renderable))
		case 'attached':
			throw html`loading...`
		case 'resolved':
			return result.value as T
		case 'rejected':
			throw result.error
	}
}
