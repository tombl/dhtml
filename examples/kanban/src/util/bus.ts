export class Bus<Event extends string> {
	#listeners: { [E in Event]?: Set<() => void> } = {}
	#channel: BroadcastChannel

	constructor(name: string) {
		this.#channel = new BroadcastChannel(name)
	}

	emit(...events: Event[]) {
		for (const event of events) {
			this.#channel.postMessage(event)

			const listeners = this.#listeners[event]
			if (listeners) for (const listener of listeners) listener()
		}
	}

	subscribe(event: Event, listener: () => void) {
		const listeners = (this.#listeners[event] ??= new Set())
		listeners.add(listener)

		const handler = ({ data }: { data: string }) => {
			if (data === event) listener()
		}
		this.#channel.addEventListener('message', handler)
		return () => {
			listeners.delete(listener)
			this.#channel.removeEventListener('message', handler)
		}
	}

	close() {
		this.#channel.close()
	}
}
