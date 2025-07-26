import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { transformSync } from 'amaro'
import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import { Hono } from 'hono'

const app = new Hono()

app.use('/node_modules/*', serveStatic({ root: './' }))

app.get('/app/:script{.+.ts}', async (c, next) => {
	await next()
	const { code } = transformSync(await c.res.text(), { mode: 'strip-only' })
	c.res = c.body(code)
	c.res.headers.set('content-type', 'text/javascript')
	c.res.headers.delete('content-length')
})
app.get('/app/*', serveStatic({ root: './' }))

app.get('/example', c =>
	c.html(
		renderToString(html`
			<!-- ${'z'} -->
			<p>a${'text'}b</p>
			<a href=${'attr'} onclick="${() => {}}"></a>
			<button ${() => 'directive'}>but</button>
			<script>
				;<span>z</span>
			</script>
			${{
				render() {
					return html`<div>${[1, 2, 3]}</div>`
				},
			}}
			${html`[${'A'}|${'B'}]`}
		`),
	),
)
app.get('/', async c => {
	const { app } = await import('./app/main.ts')

	return c.html(
		renderToString(html`
			<!doctype html>
			<html>
				<head>
					<title>dhtml ssr</title>
					<script type="importmap">
						{
							"imports": {
								"dhtml": "/node_modules/dhtml/index.js",
								"dhtml/client": "/node_modules/dhtml/client.js"
							}
						}
					</script>
				</head>
				<body>
					${app}
					<script type="module" src="/app/main.ts"></script>
				</body>
			</html>
		`),
	)
})

serve(app, addr => {
	console.log(`Listening on http://localhost:${addr.port}`)
})
