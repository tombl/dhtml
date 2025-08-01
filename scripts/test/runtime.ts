import { createBirpc } from 'birpc'
import * as mitata from 'mitata'
import * as devalue from './devalue.ts'
import type { ServerFunctions } from './main.ts'
import { assert } from './test.ts'

export type TestResult = { name: string } & ({ result: 'pass'; duration: number } | { result: 'fail'; reason: unknown })

export interface ClientFunctions {
	define<K extends keyof typeof globalThis>(name: K, value: (typeof globalThis)[K]): void
	import(path: string): Promise<unknown>
	run_tests(options: { filter?: RegExp }): Promise<void>
	run_benchmarks(options: { filter?: RegExp; builds?: Array<{ dir: string; ref: string }> }): Promise<mitata.trial[]>
	stop_coverage(): Promise<void>
}

const client: ClientFunctions = {
	define(name, value) {
		globalThis[name] = value
	},
	import(path) {
		return import(path)
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
		const { builds } = options

		if (!builds) {
			const { benchmarks } = await mitata.run({ filter: options.filter })
			return benchmarks
		} else {
			const versions = await Promise.all(
				builds.map(async ({ dir, ref }) => {
					return {
						index: (await import(`../../${dir}/dist/index.min.js`)) as typeof import('dhtml'),
						client: (await import(`../../${dir}/dist/client.min.js`)) as typeof import('dhtml/client'),
						server: (await import(`../../${dir}/dist/server.min.js`)) as typeof import('dhtml/server'),
						ref,
					}
				}),
			)

			// TODO: much like tests, export a custom bench() function from test.ts,
			// which collects in an array defined in this file, so that we don't need
			// to hardcode the bench-comparison path.
			// unlike test(), bench() will provide the lib argument to the function.
			const { get_benchmarks } = await import('../../../src/client/tests/bench-comparison.ts' as string)

			const called_versions = versions.map(lib => ({
				ref: lib.ref,
				fns: Object.entries(get_benchmarks(lib))
					.filter(([name]) => (options.filter === undefined ? true : options.filter.test(name)))
					.map(([, value]) => {
						assert(typeof value === 'function')
						return value
					}),
			}))

			const n_fns = called_versions[0].fns.length
			assert(n_fns > 0, 'filtered to 0 functions')
			for (const { fns } of called_versions.slice(1)) {
				assert(fns.length === n_fns, 'expected the same number of functions from all modules')
			}

			// Warmup runs for each version to reduce cache effects
			console.log('Running warmup iterations...')
			for (let warmup = 0; warmup < 3; warmup++) {
				for (const { ref, fns } of called_versions) {
					for (const fn of fns) fn()
				}
			}
			console.log('Warmup complete, starting benchmarks...')

			mitata.summary(() => {
				for (const { ref, fns } of called_versions) {
					mitata
						.bench(ref, () => {
							for (const fn of fns) fn()
						})
						.gc('inner')
				}
			})

			const { benchmarks } = await mitata.run()
			return benchmarks
		}
	},
	async stop_coverage() {
		if (typeof process === 'undefined') return
		const v8 = await import('node:v8')
		v8.takeCoverage()
		v8.stopCoverage()
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

export const tests: Array<{ name: string; fn: () => void | Promise<void> }> = []
