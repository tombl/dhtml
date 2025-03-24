/** @import { HTML } from 'dhtml' */
import { html_tag } from './shared.js'

/**
 * @param {TemplateStringsArray} statics
 * @param {...unknown} dynamics
 * @returns {HTML}
 */
export function html(statics, ...dynamics) {
	return {
		[html_tag]: true,
		_dynamics: dynamics,
		_statics: statics,
	}
}
