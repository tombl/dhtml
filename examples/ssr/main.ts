import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import { Hono } from 'hono'

const app = new Hono()

app.use('/node_modules/*', serveStatic({ root: './' }))

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
app.get('/', c =>
	c.html(
		renderToString(html`
			<!doctype html>
			<html>
				<head>
					<title>dhtml ssr</title>
				</head>
				<body>
					<script type="module">
						import { html } from '/node_modules/dhtml/index.js'
						import { createRoot } from '/node_modules/dhtml/client.js'
						createRoot(document.body).render(html\`<div>Hello, world!</div>\`)
					</script>
				</body>
			</html>
		`),
	),
)

serve(app, addr => {
	console.log(`Listening on http://localhost:${addr.port}`)
})
