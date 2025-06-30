import type { Displayable, Renderable } from '../index.ts'
import { assert, is_renderable } from '../shared.ts'
import { type Cleanup } from './util.ts'

export type Key = string | number | bigint | boolean | symbol | object | null

export interface Controller {
	_mount_callbacks: (() => Cleanup)[]
	_unmount_callbacks: Cleanup[]
	_invalidate: Map<object, () => void>
}

export const controllers: WeakMap<Renderable, Controller> = new WeakMap()

export function get_controller(renderable: Renderable): Controller {
	let controller = controllers.get(renderable)
	if (!controller)
		controllers.set(
			renderable,
			(controller = {
				_mount_callbacks: [],
				_unmount_callbacks: [],
				_invalidate: new Map(),
			}),
		)
	return controller
}

const keys: WeakMap<Displayable & object, Key> = new WeakMap()

export function invalidate(renderable: Renderable): void {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	controller._invalidate.forEach(invalidate => invalidate())
}

export function onMount(renderable: Renderable, callback: () => Cleanup): void {
	assert(is_renderable(renderable), 'expected a renderable')
	const controller = get_controller(renderable)
	if (controller._invalidate.size) {
		controller._unmount_callbacks.push(callback())
	} else {
		controller._mount_callbacks.push(callback)
	}
}

export function onUnmount(renderable: Renderable, callback: () => void): void {
	onMount(renderable, () => callback)
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
