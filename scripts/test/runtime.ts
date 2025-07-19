import { createBirpc } from 'birpc'
import * as devalue from './devalue.ts'
import type { ServerFunctions } from './main.ts'

globalThis.__DEV__ = true

export type TestResult = { name: string } & ({ result: 'pass' } | { result: 'fail'; reason: unknown })

export interface ClientFunctions {
	import(path: string): Promise<unknown>
	run_tests(options: { filter?: RegExp }): Promise<void>
}

const client: ClientFunctions = {
	import(path) {
		return import(path)
	},
	async run_tests(options) {
		for (const test of tests) {
			if (options.filter?.test(test.name) === false) continue
			try {
				await test.fn()
				await server.report_result({ name: test.name, result: 'pass' })
			} catch (error) {
				await server.report_result({ name: test.name, result: 'fail', reason: error })
			}
		}
	},
}

declare global {
	var __onmessage: (fn: (data: any) => void) => void
	var __postMessage: (data: any) => void
}

const server = createBirpc<ServerFunctions, ClientFunctions>(
	client,
	typeof process === 'undefined'
		? {
				post: window.__postMessage,
				on: fn => (window.__onmessage = fn),
				serialize: devalue.stringify,
				deserialize: devalue.parse,
			}
		: {
				post: data => process.send!(data),
				on: fn => process.on('message', fn),
				serialize: devalue.stringify,
				deserialize: devalue.parse,
			},
)

export const tests: Array<{
	type: 'test' | 'bench'
	name: string
	fn: () => void | Promise<void>
}> = []
