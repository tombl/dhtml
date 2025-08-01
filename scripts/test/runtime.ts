import { createBirpc } from 'birpc'
import * as mitata from 'mitata'
import * as devalue from './devalue.ts'
import type { ServerFunctions } from './main.ts'

export type TestResult = { name: string } & ({ result: 'pass'; duration: number } | { result: 'fail'; reason: unknown })

export interface ClientFunctions {
	define<K extends keyof typeof globalThis>(name: K, value: (typeof globalThis)[K]): void
	import(path: string): Promise<unknown>
	run_tests(options: { filter?: RegExp }): Promise<void>
	run_benchmarks(options: { filter?: RegExp; builds?: Array<{ path: string; ref: string }> }): Promise<mitata.trial[]>
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

		if (!builds || builds.length === 1) {
			// Single build or standard benchmarking mode
			const { benchmarks } = await mitata.run({ filter: options.filter })
			return benchmarks
		} else {
			// Multiple builds - comparison mode
			const libraries = []

			// Dynamically import all library versions
			for (const build of builds) {
				try {
					const index = await import(`../../${build.path}/index.min.js`)
					const client = await import(`../../${build.path}/client.min.js`)
					const server = await import(`../../${build.path}/server.min.js`)
					libraries.push({
						index: { html: index.html },
						client: { invalidate: client.invalidate, createRoot: client.createRoot },
						server,
						ref: build.ref,
					})
				} catch (error) {
					console.error(`Failed to import from ${build.path}:`, error)
					throw error
				}
			}

			// Import get_benchmarks function
			const benchModule = await import('../../../src/client/tests/bench-comparison.ts')
			const get_benchmarks = benchModule.get_benchmarks

			// Setup mitata comparison
			mitata.summary(() => {
				for (const lib of libraries) {
					mitata.bench(lib.ref, () => {
						const benchmarks = get_benchmarks(lib)
						// Run all benchmark functions
						for (const [name, fn] of Object.entries(benchmarks)) {
							if (name.startsWith('bench_')) {
								fn()
							}
						}
					})
				}
			})

			const { benchmarks } = await mitata.run({ filter: options.filter })
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
