import { invalidate, onMount } from 'dhtml/client'
import * as core from 'https://unpkg.com/@preact/signals-core?module'

function upgrade(rx) {
	rx.render = () => rx.value
	onMount(rx, () => rx.subscribe(() => invalidate(rx)))
	return rx
}

export const signal = (...args) => upgrade(core.signal(...args))
export const computed = (...args) => upgrade(core.computed(...args))
