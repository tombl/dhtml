import { newMessagePortRpcSession, RpcStub } from 'capnweb'
import * as mitata from 'mitata'
import type { ServerFunctions } from './main.ts'

export type TestResult = { name: string } & ({ result: 'pass'; duration: number } | { result: 'fail'; reason: unknown })

export interface ClientFunctions {
	define<K extends keyof typeof globalThis>(name: K, value: (typeof globalThis)[K]): void
	import(path: string): Promise<unknown>
	run_tests(options: { filter?: RegExp }): Promise<void>
	run_benchmarks(options: { filter?: RegExp }): Promise<mitata.trial[]>
	stop_coverage(): Promise<void>
}

const client: ClientFunctions = {
	define(name, value) {
		globalThis[name] = value
	},
	async import(path) {
		return new RpcStub((await import(path)) as object)
	},
	async run_tests(options) {
		for (const test of tests) {
			if (options.filter?.test(test.name) === false) continue

			try {
				const start = performance.now()
				await test.fn()
				const end = performance.now()
				await server.report_result({ name: test.name, result: 'pass', duration: end - start })
			} catch (error) {
				await server.report_result({ name: test.name, result: 'fail', reason: error })
			}
		}
	},
	async run_benchmarks(options) {
		const { benchmarks } = await mitata.run({ filter: options.filter })
		return benchmarks
	},
	async stop_coverage() {
		if (typeof process === 'undefined') return
		const v8 = await import('node:v8')
		v8.takeCoverage()
		v8.stopCoverage()
	},
}

declare global {
	var __onmessage: (fn: (data: string) => void) => void
	var __postMessage: (data: string) => void
}

const { port1, port2 } = new MessageChannel()
if (typeof process === 'undefined') {
	window.__onmessage = data => port1.postMessage(data)
	port1.onmessage = event => window.__postMessage(event.data)
} else {
	process.on('message', data => port1.postMessage(data))
	port1.onmessage = event => process.send!(event.data)
}

const server = newMessagePortRpcSession<ServerFunctions>(port2, client, { onSendError: e => e })

export const tests: Array<{ name: string; fn: () => void | Promise<void> }> = []
