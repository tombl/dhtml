import { test } from 'bun:test'
import { html, type Displayable } from 'dhtml'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

const dev_test = test.skipIf(!__DEV__)

test('basic html renders correctly', () => {
	const { root, el } = setup()

	root.render(html`<h1>Hello, world!</h1>`)
	assert.equal(el.innerHTML, '<h1>Hello, world!</h1>')
})

test('inner content renders correctly', () => {
	const { root, el } = setup()

	root.render(html`<h1>${html`Inner content!`}</h1>`)
	assert.equal(el.innerHTML, '<h1>Inner content!</h1>')
})

test('template with number renders correctly', () => {
	const { root, el } = setup()

	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`

	root.render(template(1))
	assert.equal(el.innerHTML, '<h1>Hello, 1!</h1>')

	root.render(template(2))
	assert.equal(el.innerHTML, '<h1>Hello, 2!</h1>')
})

test('external sibling nodes are not clobbered', () => {
	const { root, el } = setup('<div>before</div>')

	root.render(html`<h1>Hello, world!</h1>`)
	assert.equal(el.innerHTML, '<div>before</div><h1>Hello, world!</h1>')

	el.appendChild(document.createElement('div')).textContent = 'after'
	assert.equal(el.innerHTML, '<div>before</div><h1>Hello, world!</h1><div>after</div>')

	root.render(html`<h2>Goodbye, world!</h2>`)
	assert.equal(el.innerHTML, '<div>before</div><h2>Goodbye, world!</h2><div>after</div>')

	root.render(html``)
	assert.equal(el.innerHTML, '<div>before</div><div>after</div>')

	root.render(html`<h1>Hello, world!</h1>`)
	assert.equal(el.innerHTML, '<div>before</div><h1>Hello, world!</h1><div>after</div>')
})

test('identity is updated correctly', () => {
	const { root, el } = setup()

	const template = (n: Displayable) => html`<h1>Hello, ${n}!</h1>`
	const template2 = (n: Displayable) => html`<h1>Hello, ${n}!</h1>`

	root.render(template(1))
	assert.equal(el.innerHTML, '<h1>Hello, 1!</h1>')
	let h1 = el.children[0]
	const text = [...h1.childNodes].find((node): node is Text => node instanceof Text && node.data === '1')
	assert(text)

	root.render(template(2))
	assert.equal(el.innerHTML, '<h1>Hello, 2!</h1>')
	assert.equal(el.children[0], h1)
	assert.equal(text.data, '2')
	assert([...h1.childNodes].includes(text))

	root.render(template2(3))
	assert.equal(el.innerHTML, '<h1>Hello, 3!</h1>')
	assert.notStrictEqual(el.children[0], h1)
	h1 = el.children[0]

	root.render(template2(template(template('inner'))))
	assert.equal(el.innerHTML, '<h1>Hello, <h1>Hello, <h1>Hello, inner!</h1>!</h1>!</h1>')
	assert.equal(el.children[0], h1)
})

test('basic children render correctly', () => {
	const { root, el } = setup()

	root.render(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`)

	assert.equal(el.innerHTML, '<span>This is a</span> test test test')
})

test('nodes can be embedded', () => {
	const { root, el } = setup()

	let node: ParentNode = document.createElement('span')

	root.render(html`<div>${node}</div>`)
	assert.equal(el.innerHTML, '<div><span></span></div>')
	assert.equal(el.children[0].children[0], node)

	node = document.createDocumentFragment()
	node.append(document.createElement('h1'), document.createElement('h2'), document.createElement('h3'))

	root.render(html`<div>${node}</div>`)
	assert.equal(el.innerHTML, '<div><h1></h1><h2></h2><h3></h3></div>')
	assert.equal(node.children.length, 0)
})

test.skip('extra empty text nodes are not added', () => {
	const { root, el } = setup()

	root.render(html`${'abc'}`)
	assert.equal(el.childNodes.length, 1)
	assert(el.firstChild instanceof Text)
	assert.equal((el.firstChild as Text).data, 'abc')
})

test('ChildPart index shifts correctly', () => {
	const { root, el } = setup()

	root.render(html`${html`A<!--x-->`}B${'C'}`)

	assert.equal(el.innerHTML, 'A<!--x-->BC')
})

test('errors are thrown cleanly', () => {
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
	assert.equal(thrown, oops)

	// on an error, don't leave any visible artifacts
	assert.equal(el.innerHTML, '<!--dyn-$0$-->')
})

dev_test('invalid part placement raises error', () => {
	const { root, el } = setup()

	assert.throws(() => root.render(html`<${'div'}>${'text'}</${'div'}>`), {
		message: 'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
	})
	assert.equal(el.innerHTML, '')
})

dev_test('manually specifying internal template syntax throws', () => {
	const { root, el } = setup()

	assert.throws(
		() => {
			root.render(
				html`${1}
					<!--dyn-$0$-->`,
			)
		},
		{ message: 'got more parts than expected' },
	)

	assert.equal(el.innerHTML, '')
})

test('syntax close but not exact does not throw', () => {
	const { root, el } = setup()

	root.render(html`dyn-$${0}1$`)

	assert.equal(el.innerHTML, 'dyn-$01$')
})
