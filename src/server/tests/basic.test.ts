import { mock, test } from 'bun:test'
import { html } from 'dhtml'
import { renderToReadableStream, renderToString } from 'dhtml/server'
import assert from 'node:assert/strict'

const dev_test = test.skipIf(!__DEV__)

test('basic html renders correctly', async () => {
	assert.equal(await renderToString(html`<h1>Hello, world!</h1>`), '<h1>Hello, world!</h1>')
})

test('basic html renders correctly via stream', async () => {
	const stream = renderToReadableStream(html`<h1>Hello, world!</h1>`)
	assert.equal(await new Response(stream).text(), '<h1>Hello, world!</h1>')
})

test('inner content renders correctly', async () => {
	assert.equal(await renderToString(html`<h1>${html`Inner content!`}</h1>`), '<h1>Inner content!</h1>')
})

test('template with number renders correctly', async () => {
	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`
	assert.equal(await renderToString(template(1)), '<h1>Hello, 1!</h1>')
	assert.equal(await renderToString(template(2)), '<h1>Hello, 2!</h1>')
})

test('lists of items', async () => {
	assert.equal(await renderToString([1, 'a', html`<span>thing</span>`]), '1a<span>thing</span>')
})

test('basic children render correctly', async () => {
	assert.equal(
		await renderToString(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`),
		'<span>This is a</span> test test test',
	)
})

dev_test('invalid part placement raises error', async () => {
	await assert.rejects(async () => await renderToString(html`<${'div'}>${'text'}</${'div'}>`))
})

test('parts in comments work', async () => {
	assert.equal(await renderToString(html`<!-- ${'text'} -->`), '<!-- text -->')
})

dev_test('manually specifying internal template syntax throws', async () => {
	await assert.rejects(async () => {
		await renderToString(html`${1} dyn-$0$`)
	})
})

test('syntax close but not exact does not throw', async () => {
	assert.equal(await renderToString(html`dyn-$${0}1$`), 'dyn-$01$')
})

test('directives', async () => {
	const directive = mock()
	assert.equal(await renderToString(html`<p ${directive}></p>`), '<p ></p>')
	assert.equal(directive.mock.calls.length, 1)
	assert.deepEqual(directive.mock.calls[0], [])
})

test('attributes', async () => {
	assert.equal(await renderToString(html`<a href=${'/url'}></a>`), '<a href="/url"></a>')
	assert.equal(await renderToString(html`<details hidden=${false}></details>`), '<details ></details>')
	assert.equal(await renderToString(html`<details hidden=${true}></details>`), '<details hidden></details>')
})

test('collapses whitespace', async () => {
	// prettier-ignore
	assert.equal(await renderToString(html`      <p>         </p>      `), ' <p> </p> ')

	// prettier-ignore
	assert.equal(await renderToString(html`      <p>    x    </p>      `), ' <p>    x    </p> ')
})
