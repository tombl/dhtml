import { createBirpc } from 'birpc'

const runtime = typeof process === 'undefined' ? 'browser' : 'node'
const client_functions = {
	greet() {
		return `hello from ${runtime}`
	},
}
export type ClientFunctions = typeof client_functions

declare global {
	var __onmessage: (fn: (data: any) => void) => void
	var __postMessage: (data: any) => void
}

const rpc = createBirpc(
	client_functions,
	typeof process === 'undefined'
		? {
				post: window.__postMessage,
				on: fn => (window.__onmessage = fn),
			}
		: {
				post: data => process.send!(data),
				on: fn => process.on('message', fn),
				off: fn => process.off('message', fn),
			},
)
