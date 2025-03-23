import type { Displayable, Renderable } from 'dhtml'
import { assert, is_renderable } from '../shared.ts'
import { type Cleanup } from './util.ts'

export type Key = string | number | bigint | boolean | symbol | object | null

export interface Controller {
	_mount_callbacks?: Set<Cleanup> // undefined if mounted
	_unmount_callbacks: Set<Cleanup>

	_invalidate_queued?: Promise<void>
	_invalidate?: () => void
	_parent_node?: Node
}

const controllers: WeakMap<Renderable, Controller> = new WeakMap()

export function get_controller(renderable: Renderable): Controller {
	let controller = controllers.get(renderable)
	if (controller) return controller

	controller = {
		_mount_callbacks: new Set(),
		_unmount_callbacks: new Set(),
	}

	controllers.set(renderable, controller)
	return controller
}
export function delete_controller(renderable: Renderable): void {
	controllers.delete(renderable)
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
	if (controller._mount_callbacks) {
		controller._mount_callbacks.add(callback)
	} else {
		controller._unmount_callbacks.add(callback())
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
