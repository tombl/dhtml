import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import test, { type TestContext } from 'node:test'

globalThis.__DEV__ = process.env.NODE_ENV !== 'production'

test('basic html renders correctly', (t: TestContext) => {
	t.assert.strictEqual(renderToString(html`<h1>Hello, world!</h1>`), '<h1>Hello, world!</h1>')
})

test('inner content renders correctly', (t: TestContext) => {
	t.assert.strictEqual(renderToString(html`<h1>${html`Inner content!`}</h1>`), '<h1>Inner content!</h1>')
})

test('template with number renders correctly', (t: TestContext) => {
	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`
	t.assert.strictEqual(renderToString(template(1)), '<h1>Hello, 1!</h1>')
	t.assert.strictEqual(renderToString(template(2)), '<h1>Hello, 2!</h1>')
})

test('basic children render correctly', (t: TestContext) => {
	t.assert.strictEqual(
		renderToString(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`),
		'<span>This is a</span> test test test',
	)
})

test('errors are thrown cleanly', (t: TestContext) => {
	const oops = new Error('oops')
	let thrown
	try {
		renderToString(
			html`${{
				render() {
					throw oops
				},
			}}`,
		)
	} catch (error) {
		thrown = error
	}
	t.assert.strictEqual(thrown, oops)
})

test('invalid part placement raises error', { skip: process.env.NODE_ENV === 'production' }, (t: TestContext) => {
	t.assert.throws(() => renderToString(html`<${'div'}>${'text'}</${'div'}>`))
})

test('parts in comments do not throw', (t: TestContext) => {
	renderToString(html`<!-- ${'text'} -->`)
})

test(
	'manually specifying internal template syntax throws',
	{ skip: process.env.NODE_ENV === 'production' },
	(t: TestContext) => {
		t.assert.throws(() => {
			renderToString(html`${1} dyn-$0$`)
		})
	},
)

test('syntax close but not exact does not throw', (t: TestContext) => {
	t.assert.strictEqual(renderToString(html`dyn-$${0}1$`), 'dyn-$01$')
})
