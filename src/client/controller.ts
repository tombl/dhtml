import type { Displayable, Renderable } from '../index.ts'
import { assert } from '../shared.ts'

export type Key = string | number | bigint | boolean | symbol | object | null

export const controllers: WeakMap<Renderable, Map<object, () => void>> = new WeakMap()

export function get_controller(renderable: Renderable): Map<object, () => void> {
	let controller = controllers.get(renderable)
	if (!controller) controllers.set(renderable, (controller = new Map<object, () => void>()))
	return controller
}

const keys: WeakMap<Displayable & object, Key> = new WeakMap()

export function invalidate(renderable: Renderable): void {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	controller.forEach(invalidate => invalidate())
}

export function keyed<T extends Displayable & object>(displayable: T, key: Key): T {
	assert(!keys.has(displayable), 'renderable already has a key')
	keys.set(displayable, key)
	return displayable
}

export function get_key(displayable: unknown): unknown {
	// the cast is fine because getting any non-object will return null
	return keys.get(displayable as object) ?? displayable
}
