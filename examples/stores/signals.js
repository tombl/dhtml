import { invalidate, onMount } from 'dhtml/client'
import * as core from 'https://unpkg.com/alien-signals@2.0.5/esm/index.mjs'

function upgrade(rx) {
	rx.render = () => rx()
	onMount(rx, () =>
		core.effect(() => {
			rx()
			invalidate(rx)
		}),
	)
	return rx
}

export const signal = init => upgrade(core.signal(init))
export const computed = fn => upgrade(core.computed(fn))

export * from 'https://unpkg.com/alien-signals@2.0.5/esm/index.mjs'
