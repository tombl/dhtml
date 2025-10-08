import { html } from 'dhtml'
import { renderToReadableStream, renderToString } from 'dhtml/server'
import { assert, assert_eq, test } from '../../../scripts/test/test.ts'

test('basic html renders correctly', () => {
	assert_eq(renderToString(html`<h1>Hello, world!</h1>`), '<?[><h1>Hello, world!</h1><?]>')
})

test('basic html renders correctly via stream', async () => {
	const stream = renderToReadableStream(html`<h1>Hello, world!</h1>`)
	assert_eq(await new Response(stream).text(), '<?[><h1>Hello, world!</h1><?]>')
})

test('inner content renders correctly', () => {
	assert_eq(renderToString(html`<h1>${html`Inner content!`}</h1>`), '<?[><h1><?[>Inner content!<?]></h1><?]>')
})

test('template with number renders correctly', () => {
	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`
	assert_eq(renderToString(template(1)), '<?[><h1>Hello, <?[>1<?]>!</h1><?]>')
	assert_eq(renderToString(template(2)), '<?[><h1>Hello, <?[>2<?]>!</h1><?]>')
})

test('lists of items', () => {
	assert_eq(renderToString([1, 'a', html`<span>thing</span>`]), '<?[><?[>1<?]><?[>a<?]><?[><span>thing</span><?]><?]>')
})

test('basic children render correctly', () => {
	assert_eq(
		renderToString(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`),
		'<?[><span><?[>This is a<?]></span> <?[>test<?]> <?[>test<?]> <?[>test<?]><?]>',
	)
})

test('undefined children render empty', () => {
	assert_eq(renderToString(html`<div>${undefined}</div>`), '<?[><div><?[><?]></div><?]>')
	assert_eq(renderToString(html`<div>${null}</div>`), '<?[><div><?[><?]></div><?]>')
})

if (__DEV__) {
	test('invalid part placement raises error', () => {
		try {
			renderToString(html`<${'div'}>${'text'}</${'div'}>`)
			assert(false, 'Expected error to be thrown')
		} catch (error) {
			assert(error instanceof Error)
		}
	})
}

test('parts in comments do not throw', () => {
	renderToString(html`<!-- ${'text'} -->`)
})

if (__DEV__) {
	test('manually specifying internal template syntax throws', () => {
		try {
			// why is prettier deleting null bytes?
			// prettier-ignore
			renderToString(html`${1} \0`)
			assert(false, 'Expected error to be thrown')
		} catch (error) {
			assert(error instanceof Error)
		}
	})
}

test('directives', () => {
	let calls = 0
	const directive = () => {
		calls++
	}
	assert_eq(renderToString(html`<p ${directive}></p>`), '<?[><p ></p><?]>')
	assert_eq(calls, 0) // TODO: what should these look like on the server?
})

test('nullish directives are ignored', () => {
	assert_eq(renderToString(html`<p ${undefined}></p>`), '<?[><p ></p><?]>')
	assert_eq(renderToString(html`<div ${null}></div>`), '<?[><div ></div><?]>')
})

test('unquoted attributes', () => {
	assert_eq(renderToString(html`<a href=${'/url'}></a>`), '<?[><a href="/url"></a><?]>')
	assert_eq(renderToString(html`<details hidden=${false}></details>`), '<?[><details ></details><?]>')
	assert_eq(renderToString(html`<details hidden=${true}></details>`), '<?[><details hidden></details><?]>')
	assert_eq(renderToString(html`<details hidden=${undefined}></details>`), '<?[><details ></details><?]>')
})

test('quoted attributes', () => {
	assert_eq(renderToString(html`<a href="${'/url'}"></a>`), '<?[><a href="/url"></a><?]>')
	assert_eq(renderToString(html`<details hidden="${false}"></details>`), '<?[><details ></details><?]>')
	// prettier-ignore
	assert_eq(renderToString(html`<details hidden='${true}'></details>`), '<?[><details hidden></details><?]>')
})

test('collapses whitespace', () => {
	// prettier-ignore
	assert_eq(renderToString(html`      <p>         </p>      `), '<?[> <p> </p> <?]>')

	// prettier-ignore
	assert_eq(renderToString(html`      <p>    x    </p>      `), '<?[> <p> x </p> <?]>')
})

test('lexer edge cases', () => {
	// prettier-ignore
	assert_eq(renderToString(html`<div attr="value"x>`), '<?[><div attr="value"x><?]>')
	assert_eq(renderToString(html`<img/attr="value">`), '<?[><img/attr="value"><?]>')
	assert_eq(renderToString(html`<div attr /other="value"></div>`), '<?[><div attr /other="value"></div><?]>')
})
