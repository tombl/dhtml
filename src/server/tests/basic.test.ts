import { test } from 'bun:test'
import { html } from 'dhtml'
import { renderToString } from 'dhtml/server'
import assert from 'node:assert/strict'

const dev_test = test.skipIf(!__DEV__)

test('basic html renders correctly', () => {
	assert.equal(renderToString(html`<h1>Hello, world!</h1>`), '<h1>Hello, world!</h1>')
})

test('inner content renders correctly', () => {
	assert.equal(renderToString(html`<h1>${html`Inner content!`}</h1>`), '<h1>Inner content!</h1>')
})

test('template with number renders correctly', () => {
	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`
	assert.equal(renderToString(template(1)), '<h1>Hello, 1!</h1>')
	assert.equal(renderToString(template(2)), '<h1>Hello, 2!</h1>')
})

test('basic children render correctly', () => {
	assert.equal(
		renderToString(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`),
		'<span>This is a</span> test test test',
	)
})

test('errors are thrown cleanly', () => {
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
	assert.equal(thrown, oops)
})

dev_test('invalid part placement raises error', () => {
	assert.throws(() => renderToString(html`<${'div'}>${'text'}</${'div'}>`))
})

test('parts in comments do not throw', () => {
	renderToString(html`<!-- ${'text'} -->`)
})

dev_test('manually specifying internal template syntax throws', () => {
	assert.throws(() => {
		renderToString(html`${1} dyn-$0$`)
	})
})

test('syntax close but not exact does not throw', () => {
	assert.equal(renderToString(html`dyn-$${0}1$`), 'dyn-$01$')
})
