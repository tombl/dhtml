/** @import { Displayable, Renderable } from 'dhtml' */
/** @import { Controller, Key } from './types.js' */
/** @import { Cleanup } from '../types.js' */
import { assert, is_renderable } from '../shared.js'

/** @type {WeakMap<object, Controller>} */
export const controllers = new WeakMap()

/** @type {WeakMap<Displayable & object, Key>} */
export const keys = new WeakMap()

/**
 * @param {Renderable} renderable
 * @returns {Controller}
 */
export function get_controller(renderable) {
	let controller = controllers.get(renderable)
	if (controller) return controller

	controller = {
		_mount_callbacks: new Set(),
		_unmount_callbacks: new Set(),
	}

	controllers.set(renderable, controller)
	return controller
}

/**
 * @param {Renderable} renderable
 * @returns {void}
 */
export function delete_controller(renderable) {
	controllers.delete(renderable)
}

/**
 * @param {Renderable} renderable
 * @returns {Promise<void>}
 */
export function invalidate(renderable) {
	const controller = controllers.get(renderable)
	assert(controller?._invalidate, 'the renderable has not been rendered')
	return (controller._invalidate_queued ??= Promise.resolve().then(() => {
		delete controller._invalidate_queued
		assert(controller._invalidate)
		controller._invalidate()
	}))
}

/**
 * @param {Renderable} renderable
 * @param {() => Cleanup} callback
 * @returns {void}
 */
export function onMount(renderable, callback) {
	assert(is_renderable(renderable), 'expected a renderable')

	const controller = get_controller(renderable)
	if (controller._mount_callbacks) {
		controller._mount_callbacks.add(callback)
	} else {
		controller._unmount_callbacks.add(callback())
	}
}

/**
 * @param {Renderable} renderable
 * @param {() => void} callback
 * @returns {void}
 */
export function onUnmount(renderable, callback) {
	onMount(renderable, () => callback)
}

/**
 * @param {Renderable} renderable
 * @returns {Node}
 */
export function getParentNode(renderable) {
	const controller = get_controller(renderable)
	assert(controller._parent_node, 'the renderable has not been rendered')
	return controller._parent_node
}

/**
 * @template {Displayable & object} T
 * @param {T} displayable
 * @param {Key} key
 * @returns {T}
 */
export function keyed(displayable, key) {
	assert(!keys.has(displayable), 'renderable already has a key')
	keys.set(displayable, key)
	return displayable
}

/**
 * @param {unknown} displayable
 * @returns {unknown}
 */
export function get_key(displayable) {
	// the cast is fine because getting any non-object will return null
	return keys.get(/** @type {object} */ (displayable)) ?? displayable
}
