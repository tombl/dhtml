import { invalidate, onMount } from 'dhtml/client'

export function createSubscriber(renderable, subscribe, read) {
	let value = read()
	onMount(renderable, () =>
		subscribe(() => {
			const v = read()
			if (v === value) return
			value = v
			invalidate(renderable)
		}),
	)
	return () => value
}

export class Store {
	#value
	#listeners = new Set()
	constructor(value) {
		this.#value = value
	}
	get() {
		return this.#value
	}
	set(value) {
		this.#value = value
		for (const listener of this.#listeners) listener(value)
	}
	subscribe(listener) {
		this.#listeners.add(listener)
		return () => this.#listeners.delete(listener)
	}
}
