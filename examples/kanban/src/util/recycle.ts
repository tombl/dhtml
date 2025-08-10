import type { ID } from '#db'

export function createRecycler<T extends { id: ID }>(list: () => Promise<Array<{ id: ID }>>, construct: (id: ID) => T) {
	return async (prev: T[] | null) => {
		const ids = list()

		const byId = new Map<ID, T>()
		if (prev) {
			for (const item of prev) {
				byId.set(item.id, item)
			}
		}

		return (await ids).map(({ id }) => {
			const existing = byId.get(id)
			if (existing) {
				byId.delete(id)
				return existing
			} else {
				return construct(id)
			}
		})
	}
}
