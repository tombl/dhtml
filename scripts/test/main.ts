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
import * as puppeteer from 'puppeteer'
import type { ClientFunctions } from './runtime.ts'

const server_functions = {}
export type ServerFunctions = typeof server_functions

interface Runner {
	port: MessagePort
	[Symbol.asyncDispose](): Promise<void>
}

async function create_browser_runner(): Promise<Runner> {
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
					dhtml: '/dist/index.min.js',
					'dhtml/client': '/dist/client.min.js',
					'dhtml/server': '/dist/server.min.js',
					birpc: '/node_modules/birpc/dist/index.mjs',
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
		const type = msg.type()
		const args = await Promise.all(msg.args().map(arg => arg.jsonValue()))
		// @ts-ignore
		console[type](...args)
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

async function create_node_runner(): Promise<Runner> {
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

await using browser = await create_browser_runner()
await using node = await create_node_runner()

for (const port of [node.port, browser.port]) {
	const rpc = createBirpc<ClientFunctions>(server_functions, {
		post: data => port.postMessage(data),
		on: fn => {
			port.onmessage = e => fn(e.data)
		},
	})
	console.log(await rpc.greet())
}
