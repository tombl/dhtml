import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { transformSync } from 'amaro'
import { createBirpc } from 'birpc'
import { Hono } from 'hono'
import * as child_process from 'node:child_process'
import { once } from 'node:events'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, styleText } from 'node:util'
import * as puppeteer from 'puppeteer'
import * as devalue from './devalue.ts'
import type { ClientFunctions, TestResult } from './runtime.ts'

export interface ServerFunctions {
	report_result(result: TestResult): void
}

interface Runtime {
	port: MessagePort
	[Symbol.asyncDispose](): Promise<void>
}

async function create_browser_runtime(): Promise<Runtime> {
	const browser = await puppeteer.launch({
		executablePath:
			'/nix/store/nrzjaz51mg3dznpzfkzr24yk12izda2a-google-chrome-dev-140.0.7299.0/bin/google-chrome-unstable',
		// headless: false,
		// devtools: true,
	})

	const app = new Hono()

	app.get('/@runner', c =>
		c.html(`
  		<!doctype html>
      <link rel="icon" href="data:" />
      <script type="importmap">${JSON.stringify({
				imports: {
					dhtml: '/dist/index.js',
					'dhtml/client': '/dist/client.js',
					'dhtml/server': '/dist/server.js',
					birpc: '/node_modules/birpc/dist/index.mjs',
					devalue: '/node_modules/devalue/index.js',
				},
			})}</script>
      <script type="module" src="/scripts/test/runtime.ts"></script>
    `),
	)

	app.use(async (c, next) => {
		await next()
		if (c.res.ok && c.req.path.endsWith('.ts')) {
			const { code } = transformSync(await c.res.text(), { mode: 'strip-only' })
			c.res = c.body(code)
			c.res.headers.set('content-type', 'text/javascript')
			c.res.headers.delete('content-length')
		}
	})
	app.use(serveStatic({ root: './' }))

	const server = serve({
		fetch: app.fetch,
		port: 0,
	})

	let addr = server.address()!
	if (typeof addr !== 'string') {
		addr = addr.family === 'IPv6' ? `[${addr.address}]:${addr.port}` : `${addr.address}:${addr.port}`
	}

	const [page] = await browser.pages()
	page.on('console', async msg => {
		const args = await Promise.all(msg.args().map(arg => arg.jsonValue()))
		const type = msg.type()
		switch (type) {
			case 'startGroup':
				console.group(...args)
				break
			case 'startGroupCollapsed':
				console.groupCollapsed(...args)
				break
			case 'endGroup':
				console.groupEnd()
				break
			case 'verbose':
				console.log(...args)
				break
			default:
				const fn = console[type]
				// @ts-expect-error
				fn(...args)
		}
	})
	const { port1, port2 } = new MessageChannel()
	await page.exposeFunction('__postMessage', (data: any) => port1.postMessage(data))

	await page.goto(`http://${addr}/@runner`)

	const onmessage = await page.waitForFunction(() => window.__onmessage)
	port1.onmessage = e => onmessage.evaluate((fn, data) => fn(data), e.data)

	return {
		port: port2,
		async [Symbol.asyncDispose]() {
			port1.close()
			server.close()
			await browser.close()
		},
	}
}

async function create_node_runtime(): Promise<Runtime> {
	const coverage_dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coverage-'))
	const child = child_process.fork(fileURLToPath(import.meta.resolve('./runtime.ts')), {
		env: { NODE_V8_COVERAGE: coverage_dir },
		stdio: 'inherit',
	})

	const { port1, port2 } = new MessageChannel()
	port1.onmessage = e => child.send(e.data)
	child.on('message', data => port1.postMessage(data))

	await once(child, 'spawn')

	return {
		port: port2,
		async [Symbol.asyncDispose]() {
			port1.close()
			child.kill()
			await fs.rm(coverage_dir, { recursive: true })
		},
	}
}

const args = parseArgs({
	options: {
		filter: { type: 'string', short: 'f' },
	},
	allowPositionals: true,
})

const filter = args.values.filter !== undefined ? new RegExp(args.values.filter) : undefined

const all_files: { [runtime: string]: string[] } = {}
for (const arg of args.positionals) {
	for await (const file of fs.glob(arg)) {
		const runtime = file.includes('server') ? 'node' : 'browser'
		;(all_files[runtime] ??= []).push(file)
	}
}

const runs = (
	await Promise.all(
		Object.entries(all_files).map(async ([runtime, files]) => {
			const rt = runtime === 'node' ? await create_node_runtime() : await create_browser_runtime()
			await using _ = rt // workaround for https://issues.chromium.org/issues/409478039

			let results: TestResult[] = []

			const client = createBirpc<ClientFunctions, ServerFunctions>(
				{
					report_result(run) {
						const PASS = styleText(['green'], 'PASS')
						const FAIL = styleText(['red'], 'FAIL')
						console.log(run.result === 'pass' ? PASS : FAIL, run.name)
						if (run.result === 'fail') console.log(run.reason)

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

			const here = path.join(fileURLToPath(import.meta.url), '..')
			await Promise.all(files.map(file => client.import('./' + path.relative(here, file))))
			await client.run_tests({ filter: filter })

			return results
		}),
	)

	await client.define('__DEV__', !args.values.prod)

	const here = path.join(fileURLToPath(import.meta.url), '..')
	await Promise.all(files.map(file => client.import('./' + path.relative(here, file))))

	if (args.values.bench) {
		await client.run_benchmarks({ filter })
	} else {
		await client.run_tests({ filter })
	}
}

if (args.values.bench) {
} else {
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
