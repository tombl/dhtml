import type { Displayable, Renderable } from '../index.ts'
import { assert, is_renderable, type Cleanup } from '../shared.ts'

export type Key = string | number | bigint | boolean | symbol | object | null

export interface Controller {
	_mounted: boolean
	_mount_callbacks: Cleanup[]
	_unmount_callbacks: Cleanup[]

	_invalidate_queued?: Promise<void>
	_invalidate?: () => void
	_parent_node?: Node
}

const controllers: WeakMap<Renderable, Controller> = new WeakMap()

export function get_controller(renderable: Renderable): Controller {
	let controller = controllers.get(renderable)
	if (!controller)
		controllers.set(
			renderable,
			(controller = {
				_mounted: false,
				_mount_callbacks: [],
				_unmount_callbacks: [],
			}),
		)
	return controller
}

const keys: WeakMap<Displayable & object, Key> = new WeakMap()

export function invalidate(renderable: Renderable): Promise<void> {
	const controller = controllers.get(renderable)
	assert(controller?._invalidate, 'the renderable has not been rendered')
	return (controller._invalidate_queued ??= Promise.resolve().then(() => {
		delete controller._invalidate_queued
		controller._invalidate!()
	}))
}

export function onMount(renderable: Renderable, callback: () => Cleanup): void {
	assert(is_renderable(renderable), 'expected a renderable')
	const controller = get_controller(renderable)
	if (controller._mounted) {
		controller._unmount_callbacks.push(callback())
	} else {
		controller._mount_callbacks.push(callback)
	}
}

export function onUnmount(renderable: Renderable, callback: () => void): void {
	onMount(renderable, () => callback)
}

export function getParentNode(renderable: Renderable): Node {
	const controller = get_controller(renderable)
	assert(controller._parent_node, 'the renderable has not been rendered')
	return controller._parent_node
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
