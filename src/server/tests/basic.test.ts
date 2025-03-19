import { html } from 'dhtml'
import { renderToReadableStream, renderToString } from 'dhtml/server'
import { assert, assert_eq, test } from '../../../scripts/test/test.ts'

test('basic html renders correctly', async () => {
	assert_eq(await renderToString(html`<h1>Hello, world!</h1>`), '<h1>Hello, world!</h1>')
})

test('basic html renders correctly via stream', async () => {
	const stream = renderToReadableStream(html`<h1>Hello, world!</h1>`)
	assert_eq(await new Response(stream).text(), '<h1>Hello, world!</h1>')
})

test('inner content renders correctly', async () => {
	assert_eq(await renderToString(html`<h1>${html`Inner content!`}</h1>`), '<h1>Inner content!</h1>')
})

test('template with number renders correctly', async () => {
	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`
	assert_eq(await renderToString(template(1)), '<h1>Hello, 1!</h1>')
	assert_eq(await renderToString(template(2)), '<h1>Hello, 2!</h1>')
})

test('lists of items', async () => {
	assert_eq(await renderToString([1, 'a', html`<span>thing</span>`]), '1a<span>thing</span>')
})

test('basic children render correctly', async () => {
	assert_eq(
		await renderToString(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`),
		'<span>This is a</span> test test test',
	)
})

if (__DEV__) {
	test('invalid part placement raises error', async () => {
		try {
			await renderToString(html`<${'div'}>${'text'}</${'div'}>`)
			assert(false, 'Expected error to be thrown')
		} catch (error) {
			assert(error instanceof Error)
		}
	})
}

test('parts in comments work', async () => {
	assert.equal(await renderToString(html`<!-- ${'text'} -->`), '<!-- text -->')
})

if (__DEV__) {
	test('manually specifying internal template syntax throws', async () => {
		try {
			// why is prettier deleting null bytes?
			// prettier-ignore
			await renderToString(html`${1} \0`)
			assert(false, 'Expected error to be thrown')
		} catch (error) {
			assert(error instanceof Error)
		}
	})
}

test('syntax close but not exact does not throw', async () => {
	assert.equal(await renderToString(html`dyn-$${0}1$`), 'dyn-$01$')
})

test('directives', async () => {
	let calls = 0
	const directive = () => {
		calls++
	}
	assert_eq(await renderToString(html`<p ${directive}></p>`), '<p ></p>')
	assert_eq(calls, 1)
})

test('unquoted attributes', async () => {
	assert_eq(await renderToString(html`<a href=${'/url'}></a>`), '<a href="/url"></a>')
	assert_eq(await renderToString(html`<details hidden=${false}></details>`), '<details ></details>')
	assert_eq(await renderToString(html`<details hidden=${true}></details>`), '<details hidden></details>')
})

test('quoted attributes', async () => {
	assert_eq(await renderToString(html`<a href="${'/url'}"></a>`), '<a href="/url"></a>')
	assert_eq(await renderToString(html`<details hidden="${false}"></details>`), '<details ></details>')
	// prettier-ignore
	assert_eq(await renderToString(html`<details hidden='${true}'></details>`), '<details hidden></details>')
})

test('collapses whitespace', async () => {
	// prettier-ignore
	assert_eq(await renderToString(html`      <p>         </p>      `), ' <p> </p> ')

	// prettier-ignore
	assert_eq(await renderToString(html`      <p>    x    </p>      `), ' <p> x </p> ')
})

test('lexer edge cases', async () => {
	// prettier-ignore
	assert_eq(await renderToString(html`<div attr="value"x>`), '<div attr="value"x>')
	assert_eq(await renderToString(html`<img/attr="value">`), '<img/attr="value">')
	assert_eq(await renderToString(html`<div attr /other="value"></div>`), '<div attr /other="value"></div>')
})
