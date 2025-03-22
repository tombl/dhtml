import { assert, DEV } from './internal.ts'
import { isRenderable, type Cleanup, type Displayable, type Renderable } from './util.ts'

export type Key = string | number | bigint | boolean | symbol | object | null

export const controllers = new WeakMap<
	object,
	{
		_mounted: boolean
		_invalidateQueued: Promise<void> | null
		_invalidate: () => void
		_unmountCallbacks: Set<Cleanup> | null
		_parentNode: Node
	}
>()
export const keys = new WeakMap<Displayable & object, Key>()
export const mountCallbacks = new WeakMap<Renderable, Set<() => Cleanup>>()

export function invalidate(renderable: Renderable): Promise<void> {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return (controller._invalidateQueued ??= Promise.resolve().then(() => {
		controller._invalidateQueued = null
		controller._invalidate()
	}))
}

export function onMount(renderable: Renderable, callback: () => Cleanup) {
	DEV: assert(isRenderable(renderable), 'expected a renderable')

	const controller = controllers.get(renderable)
	if (controller?._mounted) {
		;(controller._unmountCallbacks ??= new Set()).add(callback())
		return
	}

	let cb = mountCallbacks.get(renderable)
	if (!cb) mountCallbacks.set(renderable, (cb = new Set()))
	cb.add(callback)
}

export function onUnmount(renderable: Renderable, callback: () => void) {
	onMount(renderable, () => callback)
}

export function getParentNode(renderable: Renderable) {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return controller._parentNode
}

export function keyed<T extends Displayable & object>(renderable: T, key: Key): T {
	if (DEV && keys.has(renderable)) throw new Error('renderable already has a key')
	keys.set(renderable, key)
	return renderable
}
