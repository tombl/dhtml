import * as child_process from 'node:child_process'
import { once } from 'node:events'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Runtime } from './main.ts'

export interface NodeRuntimeOptions {
	collect_coverage?: boolean
}

export async function create_node_runtime(options: NodeRuntimeOptions = {}): Promise<Runtime> {
	const collect_coverage = options.collect_coverage ?? true
	const coverage_dir = collect_coverage ? await fs.mkdtemp(path.join(os.tmpdir(), 'coverage-')) : null
	const child = child_process.fork(fileURLToPath(import.meta.resolve('./runtime.ts')), {
		env: collect_coverage ? { ...process.env, NODE_V8_COVERAGE: coverage_dir! } : process.env,
		stdio: 'inherit',
	})

	const { port1, port2 } = new MessageChannel()
	port1.onmessage = e => child.send(e.data)
	child.on('message', data => port1.postMessage(data))

	await once(child, 'spawn')

	return {
		port: port2,
		async coverage() {
			if (!collect_coverage || !coverage_dir) return []
			const [filename] = await fs.readdir(coverage_dir)
			const { result } = JSON.parse(await fs.readFile(path.join(coverage_dir, filename), 'utf8'))
			return result
		},
		async [Symbol.asyncDispose]() {
			port1.close()
			child.kill()
			if (coverage_dir) await fs.rm(coverage_dir, { recursive: true })
		},
	}
}
