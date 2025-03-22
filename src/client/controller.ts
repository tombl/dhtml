import type { Displayable, Renderable } from '../shared.ts'
import { assert, DEV } from './internal.ts'
import { is_renderable, type Cleanup } from './util.ts'

export type Key = string | number | bigint | boolean | symbol | object | null

export const controllers: WeakMap<
	object,
	{
		_mounted: boolean
		_invalidate_queued: Promise<void> | null
		_invalidate: () => void
		_unmount_callbacks: Set<Cleanup> | null
		_parent_node: Node
	}
> = new WeakMap()

export const keys: WeakMap<Displayable & object, Key> = new WeakMap()
export const mount_callbacks: WeakMap<Renderable, Set<() => Cleanup>> = new WeakMap()

export function invalidate(renderable: Renderable): Promise<void> {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return (controller._invalidate_queued ??= Promise.resolve().then(() => {
		controller._invalidate_queued = null
		controller._invalidate()
	}))
}

export function onMount(renderable: Renderable, callback: () => Cleanup): void {
	assert(is_renderable(renderable), 'expected a renderable')

	const controller = controllers.get(renderable)
	if (controller?._mounted) {
		;(controller._unmount_callbacks ??= new Set()).add(callback())
		return
	}

	let cb = mount_callbacks.get(renderable)
	if (!cb) mount_callbacks.set(renderable, (cb = new Set()))
	cb.add(callback)
}

export function onUnmount(renderable: Renderable, callback: () => void): void {
	onMount(renderable, () => callback)
}

export function getParentNode(renderable: Renderable): Node {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return controller._parent_node
}

export function keyed<T extends Displayable & object>(renderable: T, key: Key): T {
	if (DEV && keys.has(renderable)) throw new Error('renderable already has a key')
	keys.set(renderable, key)
	return renderable
}
