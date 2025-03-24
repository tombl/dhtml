/** @import { Displayable, HTML, Renderable } from 'dhtml' */
import { html } from './index.js'

/**
 * @param {unknown} value
 * @returns {value is Renderable}
 */
export function is_renderable(value) {
	return typeof value === 'object' && value !== null && 'render' in value
}

/**
 * @param {unknown} value
 * @returns {value is Iterable<unknown>}
 */
export function is_iterable(value) {
	return typeof value === 'object' && value !== null && Symbol.iterator in value
}

/**
 * @param {unknown} value
 * @param {string} [message]
 * @returns {asserts value}
 */
export function assert(value, message) {
	if (!__DEV__) return
	if (!value) throw new Error(message ?? 'assertion failed')
}

/** @type {unique symbol} */
export const html_tag = Symbol()

/**
 * @param {any} value
 * @returns {value is HTML}
 */
export function is_html(value) {
	return typeof value === 'object' && value !== null && html_tag in value
}

/**
 * @param {Displayable} part
 * @returns {HTML}
 */
export function single_part_template(part) {
	return html`${part}`
}
