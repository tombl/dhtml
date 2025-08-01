import { createBirpc } from 'birpc'
import type { ExecFileOptions } from 'node:child_process'
import { execFile } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify, styleText } from 'node:util'
import { create_browser_runtime } from './browser-runtime.ts'
import { handle_coverage, type Coverage } from './coverage.ts'
import * as devalue from './devalue.ts'
import { create_node_runtime } from './node-runtime.ts'
import type { ClientFunctions, TestResult } from './runtime.ts'

export interface ServerFunctions {
	report_result(result: TestResult): void
}

export interface Runtime {
	port: MessagePort
	coverage(): Promise<Coverage[]>
	[Symbol.asyncDispose](): Promise<void>
}

const args = parseArgs({
	options: {
		bench: { type: 'boolean', short: 'b', default: false },
		prod: { type: 'boolean', short: 'p', default: false },
		filter: { type: 'string', short: 'f' },
		compare: { type: 'string', short: 'c' },
	},
	allowPositionals: true,
})

const filter = args.values.filter !== undefined ? new RegExp(args.values.filter) : undefined
const exec_file = promisify(execFile)

const all_files: { [runtime: string]: string[] } = {}
for (const arg of args.positionals) {
	for await (const file of fs.glob(arg)) {
		const runtime = file.includes('server') ? 'node' : 'browser'
		;(all_files[runtime] ??= []).push(file)
	}
}

const results: TestResult[] = []
const coverage: Coverage[] = []

for (const [runtime, files] of Object.entries(all_files)) {
	const rt = runtime === 'node' ? await create_node_runtime() : await create_browser_runtime()
	await using _ = rt // workaround for https://issues.chromium.org/issues/409478039

	const client = createBirpc<ClientFunctions, ServerFunctions>(
		{
			report_result(run) {
				if (run.result === 'pass') {
					console.log(styleText('green', 'PASS'), run.name, styleText('dim', `(${run.duration.toFixed(1)}ms)`))
				} else {
					console.log(styleText('red', 'FAIL'), run.name)
					console.log(run.reason)
					console.log()
				}

				results.push(run)
			},
		},
		{
			post: data => rt.port.postMessage(data),
			on: fn => {
				rt.port.onmessage = e => fn(e.data)
			},
			serialize: devalue.stringify,
			deserialize: devalue.parse,
		},
	)

	await client.define('__DEV__', !args.values.prod)

	const here = path.join(fileURLToPath(import.meta.url), '..')

	if (args.values.bench && args.values.compare) {
		const commits = args.values.compare.split(',').map(c => c.trim())

		const builds = await Promise.all(
			commits.map(async ref => {
				const dir = `temp-worktree-${ref}`

				console.log(`Building ${ref}`)

				await exec_file('git', ['worktree', 'add', dir, ref], { stdio: 'inherit' } as ExecFileOptions)
				await exec_file('npm', ['install'], { stdio: 'inherit', cwd: dir } as ExecFileOptions)
				await exec_file('npm', ['run', 'build'], { stdio: 'inherit', cwd: dir } as ExecFileOptions)

				console.log(`Completed building ${ref}`)

				return { dir, ref }
			}),
		)

		try {
			await client.run_benchmarks({ filter, builds })
		} finally {
			await Promise.all(
				builds.map(({ dir }) => exec_file('git', ['worktree', 'remove', dir], { stdio: 'inherit' } as ExecFileOptions)),
			)
		}
	} else {
		await Promise.all(files.map(file => client.import('./' + path.relative(here, file))))
	}

	if (args.values.bench && !args.values.compare) {
		await client.run_benchmarks({ filter })
	} else {
		await client.run_tests({ filter })
	}

	await client.stop_coverage()
	coverage.push(...(await rt.coverage()))
}

if (!args.values.bench) {
	await handle_coverage(coverage)

	if (results.length === 0) {
		console.log('no tests found')
		process.exitCode = 1
	} else {
		const passed = results.reduce((count, { result }) => count + (result === 'pass' ? 1 : 0), 0)
		const failed = results.reduce((count, { result }) => count + (result === 'fail' ? 1 : 0), 0)

		console.log()
		console.log(`${passed} passed`)
		if (failed) {
			console.log(`${failed} failed`)
			process.exitCode = 1
		}
	}
}
