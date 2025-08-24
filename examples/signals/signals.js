import * as core from 'alien-signals'
import { invalidate, onMount } from 'dhtml/client'

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

export * from 'alien-signals'
