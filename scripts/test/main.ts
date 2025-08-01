import { createBirpc } from 'birpc'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, styleText } from 'node:util'
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

async function setup_comparison_builds(commits: string[]): Promise<{ paths: string[]; cleanup: () => void }> {
	const build_paths: string[] = []
	const temp_dirs: string[] = []

	for (let i = 0; i < commits.length; i++) {
		const commit = commits[i]
		const temp_dir = `temp-worktree-${i}`

		console.log(`Building version ${i + 1}: ${commit}`)

		// Create worktree for this commit
		execSync(`git worktree add ${temp_dir} ${commit}`, { stdio: 'inherit' })
		temp_dirs.push(temp_dir)

		// Build in the worktree
		execSync('npm install', { stdio: 'inherit', cwd: temp_dir })
		execSync('npm run build', { stdio: 'inherit', cwd: temp_dir })

		// Use the dist directory directly from the worktree
		build_paths.push(`${temp_dir}/dist`)
	}

	const cleanup = () => {
		// Clean up worktrees
		for (const temp_dir of temp_dirs) {
			try {
				execSync(`git worktree remove ${temp_dir}`, { stdio: 'inherit' })
			} catch (error) {
				console.warn(`Failed to remove worktree ${temp_dir}:`, error)
			}
		}
	}

	return { paths: build_paths, cleanup }
}

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

	if (args.values.bench) {
		if (args.values.compare) {
			const commits = args.values.compare.split(',').map(c => c.trim())
			if (commits.length !== 2) {
				throw new Error('--compare requires exactly two comma-separated commit references')
			}
			const { paths: library_paths, cleanup } = await setup_comparison_builds(commits)
			try {
				// Don't import bench.ts for comparison mode - handled internally
				await client.run_benchmarks({ filter, library_paths })
			} finally {
				cleanup()
			}
		} else {
			// Import bench files for standard mode
			await Promise.all(files.map(file => client.import('./' + path.relative(here, file))))
			await client.run_benchmarks({ filter })
		}
	} else {
		// Import test files for test mode
		await Promise.all(files.map(file => client.import('./' + path.relative(here, file))))
		await client.run_tests({ filter })
	}

	await client.stop_coverage()
	coverage.push(...(await rt.coverage()))
}

if (args.values.bench) {
} else {
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
