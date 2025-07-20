import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { transformSync } from 'amaro'
import { Hono } from 'hono'
import * as puppeteer from 'puppeteer'
import type { Runtime } from './main.ts'

export async function create_browser_runtime(): Promise<Runtime> {
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
					mitata: '/node_modules/mitata/src/main.mjs',
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
	app.use(async (c, next) => {
		await next()
		c.header('Cross-Origin-Opener-Policy', 'same-origin')
		c.header('Cross-Origin-Embedder-Policy', 'require-corp')
		c.header('Cross-Origin-Resource-Policy', 'same-origin')
	})

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
