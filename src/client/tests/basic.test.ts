import { html, type Displayable } from 'dhtml'
import test, { type TestContext } from 'node:test'
import { setup } from './setup.ts'

test('basic html renders correctly', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<h1>Hello, world!</h1>`)
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, world!</h1>')
})

test('inner content renders correctly', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<h1>${html`Inner content!`}</h1>`)
	t.assert.strictEqual(el.innerHTML, '<h1>Inner content!</h1>')
})

test('template with number renders correctly', (t: TestContext) => {
	const { root, el } = setup()

	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`

	root.render(template(1))
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, 1!</h1>')

	root.render(template(2))
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, 2!</h1>')
})

test('external sibling nodes are not clobbered', (t: TestContext) => {
	const { root, el } = setup('<div>before</div>')

	root.render(html`<h1>Hello, world!</h1>`)
	t.assert.strictEqual(el.innerHTML, '<div>before</div><h1>Hello, world!</h1>')

	el.appendChild(document.createElement('div')).textContent = 'after'
	t.assert.strictEqual(el.innerHTML, '<div>before</div><h1>Hello, world!</h1><div>after</div>')

	root.render(html`<h2>Goodbye, world!</h2>`)
	t.assert.strictEqual(el.innerHTML, '<div>before</div><h2>Goodbye, world!</h2><div>after</div>')

	root.render(html``)
	t.assert.strictEqual(el.innerHTML, '<div>before</div><div>after</div>')

	root.render(html`<h1>Hello, world!</h1>`)
	t.assert.strictEqual(el.innerHTML, '<div>before</div><h1>Hello, world!</h1><div>after</div>')
})

test('identity is updated correctly', (t: TestContext) => {
	const { root, el } = setup()

	const template = (n: Displayable) => html`<h1>Hello, ${n}!</h1>`
	const template2 = (n: Displayable) => html`<h1>Hello, ${n}!</h1>`

	root.render(template(1))
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, 1!</h1>')
	let h1 = el.children[0]
	const text = h1.childNodes[1] as Text
	t.assert.ok(text instanceof Text)
	t.assert.strictEqual(text.data, '1')

	root.render(template(2))
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, 2!</h1>')
	t.assert.strictEqual(el.children[0], h1)
	t.assert.strictEqual(text.data, '2')
	t.assert.strictEqual(h1.childNodes[1], text)

	root.render(template2(3))
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, 3!</h1>')
	t.assert.notStrictEqual(el.children[0], h1)
	h1 = el.children[0]

	root.render(template2(template(template('inner'))))
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, <h1>Hello, <h1>Hello, inner!</h1>!</h1>!</h1>')
	t.assert.strictEqual(el.children[0], h1)
})

test('basic children render correctly', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`)

	t.assert.strictEqual(el.innerHTML, '<span>This is a</span> test test test')
})

test('nodes can be embedded', (t: TestContext) => {
	const { root, el } = setup()

	let node: ParentNode = document.createElement('span')

	root.render(html`<div>${node}</div>`)
	t.assert.strictEqual(el.innerHTML, '<div><span></span></div>')
	t.assert.strictEqual(el.children[0].children[0], node)

	node = document.createDocumentFragment()
	node.append(document.createElement('h1'), document.createElement('h2'), document.createElement('h3'))

	root.render(html`<div>${node}</div>`)
	t.assert.strictEqual(el.innerHTML, '<div><h1></h1><h2></h2><h3></h3></div>')
	t.assert.strictEqual(node.children.length, 0)
})

test.skip('extra empty text nodes are not added', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`${'abc'}`)
	t.assert.strictEqual(el.childNodes.length, 1)
	t.assert.ok(el.firstChild instanceof Text)
	t.assert.strictEqual((el.firstChild as Text).data, 'abc')
})

test('ChildPart index shifts correctly', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`${html`A<!--x-->`}B${'C'}`)

	t.assert.strictEqual(el.innerHTML, 'A<!--x-->BC')
})

test('errors are thrown cleanly', (t: TestContext) => {
	const { root, el } = setup()

	const oops = new Error('oops')
	let thrown
	try {
		root.render(
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

	// on an error, don't leave any visible artifacts
	t.assert.strictEqual(el.innerHTML, '<!---->')
})

test('invalid part placement produces warning', { skip: process.env.NODE_ENV === 'production' }, (t: TestContext) => {
	const { root, el } = setup()

	t.assert.throws(() => root.render(html`<${'div'}>${'text'}</${'div'}>`), {
		message: 'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
	})
	t.assert.strictEqual(el.innerHTML, '')
})

test('parts in comments do not throw', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`<!-- ${'text'} -->`)
	t.assert.strictEqual(el.innerHTML, '<!-- dyn-$0$ -->')
})

test(
	'manually specifying internal template syntax throws',
	{ skip: process.env.NODE_ENV === 'production' },
	(t: TestContext) => {
		const { root, el } = setup()

		t.assert.throws(
			() => {
				root.render(html`${1} dyn-$0$`)
			},
			{ message: 'got more parts than expected' },
		)

		t.assert.strictEqual(el.innerHTML, '')
	},
)

test('syntax close but not exact does not throw', (t: TestContext) => {
	const { root, el } = setup()

	root.render(html`dyn-$${0}1$`)

	t.assert.strictEqual(el.innerHTML, 'dyn-$01$')
})
