import type { Renderable } from '../index.ts'
import { assert, is_renderable } from '../shared.ts'
import { type Cleanup } from './util.ts'

export interface Controller {
	_mount_callbacks: (() => Cleanup)[]
	_unmount_callbacks: Cleanup[]
	_invalidate: Map<object, () => void>
}

export const controllers: WeakMap<Renderable, Controller> = new WeakMap()
const invalidated_controllers: Set<Controller> = new Set()
let invalidate_queued: null | Promise<void> = null

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

export function invalidate(...renderables: Renderable[]): Promise<void> {
	for (const renderable of renderables) invalidated_controllers.add(get_controller(renderable))

	return (invalidate_queued ??= Promise.resolve()
		.then(() => {
			for (const controller of invalidated_controllers) {
				invalidated_controllers.delete(controller)
				controller._invalidate.forEach(invalidate => invalidate())
			}
		})
		.finally(() => {
			invalidate_queued = null
		}))
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
