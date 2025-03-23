import { html, type Displayable } from 'dhtml'
import { keyed } from 'dhtml/client'
import test, { type TestContext } from 'node:test'
import { setup } from './setup.ts'

function shuffle<T>(array: T[]) {
	for (let i = 0; i < array.length; i++) {
		const j = Math.floor(Math.random() * i)
		;[array[i], array[j]] = [array[j], array[i]]
	}
}

test('basic list operations work correctly', (t: TestContext) => {
	const { root, el } = setup()

	let items: Displayable[] | null = null
	const listOfItems = () => html`
		<ul>
			<li>Before</li>
			${items}
			<li>After</li>
		</ul>
	`

	root.render(listOfItems())
	t.assert.strictEqual(el.innerHTML.replace(/\s+/g, ' '), ' <ul> <li>Before</li> <li>After</li> </ul> ')

	items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`, html`<li>Item 3</li>`]

	root.render(listOfItems())
	t.assert.strictEqual(
		el.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li> <li>After</li> </ul> ',
	)
	const [item1, item2, item3] = el.querySelectorAll('li')

	items.push(html`<li>Item 4</li>`)
	root.render(listOfItems())
	t.assert.strictEqual(
		el.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li> <li>After</li> </ul> ',
	)
	const [item1b, item2b, item3b] = el.querySelectorAll('li')
	t.assert.strictEqual(item1, item1b)
	t.assert.strictEqual(item2, item2b)
	t.assert.strictEqual(item3, item3b)

	items.pop()
	items.pop()
	root.render(listOfItems())
	t.assert.strictEqual(
		el.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li> <li>After</li> </ul> ',
	)
	const [item1c, item2c] = el.querySelectorAll('li')
	t.assert.strictEqual(item1, item1c)
	t.assert.strictEqual(item2, item2c)
})

test('pop operation works correctly on lists', (t: TestContext) => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2] = el.children

	items.pop()
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 1</p><p>Item 2</p>]')
	t.assert.strictEqual(el.children[0], item1)
	t.assert.strictEqual(el.children[1], item2)

	items.pop()
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 1</p>]')
	t.assert.strictEqual(el.children[0], item1)

	items.pop()
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[]')
})

test('swap operation works correctly on lists', (t: TestContext) => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2, item3] = el.children

	// swap the first two items
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 2</p><p>Item 1</p><p>Item 3</p>]')
	t.assert.strictEqual(el.children[0], item2)
	t.assert.strictEqual(el.children[1], item1)
	t.assert.strictEqual(el.children[2], item3)

	// swap the last two items
	;[items[1], items[2]] = [items[2], items[1]]
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 2</p><p>Item 3</p><p>Item 1</p>]')
	t.assert.strictEqual(el.children[0], item2)
	t.assert.strictEqual(el.children[1], item3)
	t.assert.strictEqual(el.children[2], item1)

	// swap the first and last items
	;[items[0], items[2]] = [items[2], items[0]]
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 1</p><p>Item 3</p><p>Item 2</p>]')
	t.assert.strictEqual(el.children[0], item1)
	t.assert.strictEqual(el.children[1], item3)
	t.assert.strictEqual(el.children[2], item2)

	// put things back
	;[items[1], items[2]] = [items[2], items[1]]
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	t.assert.strictEqual(el.children[0], item1)
	t.assert.strictEqual(el.children[1], item2)
	t.assert.strictEqual(el.children[2], item3)
})

test('shift operation works correctly on lists', (t: TestContext) => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [, item2, item3] = el.children

	items.shift()
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 2</p><p>Item 3</p>]')
	t.assert.strictEqual(el.children[0], item2)
	t.assert.strictEqual(el.children[1], item3)

	items.shift()
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[<p>Item 3</p>]')
	t.assert.strictEqual(el.children[0], item3)

	items.shift()
	root.render(wrapped)
	t.assert.strictEqual(el.innerHTML, '[]')
})

test('full then empty then full list renders correctly', (t: TestContext) => {
	const { root, el } = setup()

	root.render([1])
	t.assert.strictEqual(el.innerHTML, '1')

	root.render([])
	t.assert.strictEqual(el.innerHTML, '')

	root.render([2])
	t.assert.strictEqual(el.innerHTML, '2')
})

test('list can disappear when condition changes', (t: TestContext) => {
	const { root, el } = setup()

	const app = {
		show: true,
		render() {
			if (!this.show) return null
			return [1, 2, 3].map(i => html`<div>${i}</div>`)
		},
	}

	root.render(app)
	t.assert.strictEqual(el.innerHTML, '<div>1</div><div>2</div><div>3</div>')

	app.show = false
	root.render(app)
	t.assert.strictEqual(el.innerHTML, '')
})

test('unkeyed lists recreate elements when reordered', (t: TestContext) => {
	const { root, el } = setup()

	const a = () => html`<h1>Item 1</h1>`
	const b = () => html`<h2>Item 2</h2>`

	root.render([a(), b()])
	t.assert.strictEqual(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	t.assert.strictEqual(h1.tagName, 'H1')
	t.assert.strictEqual(h2.tagName, 'H2')

	root.render([b(), a()])
	t.assert.strictEqual(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')

	// visually they should be swapped
	t.assert.strictEqual(el.children[0].innerHTML, h2.innerHTML)
	t.assert.strictEqual(el.children[1].innerHTML, h1.innerHTML)

	// but there's no stable identity, so they're recreated
	t.assert.notStrictEqual(el.children[0], h2)
	t.assert.notStrictEqual(el.children[1], h1)
})

test('explicit keyed lists preserve identity when reordered', (t: TestContext) => {
	const { root, el } = setup()

	const a = () => keyed(html`<h1>Item 1</h1>`, 1)
	const b = () => keyed(html`<h2>Item 2</h2>`, 2)

	root.render([a(), b()])
	t.assert.strictEqual(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	t.assert.strictEqual(h1.tagName, 'H1')
	t.assert.strictEqual(h2.tagName, 'H2')

	root.render([b(), a()])
	t.assert.strictEqual(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')

	t.assert.strictEqual(el.children[0], h2)
	t.assert.strictEqual(el.children[1], h1)
})

test('implicit keyed lists preserve identity when reordered', (t: TestContext) => {
	const { root, el } = setup()

	const items = [html`<h1>Item 1</h1>`, html`<h2>Item 2</h2>`]

	root.render(items)
	t.assert.strictEqual(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	t.assert.strictEqual(h1.tagName, 'H1')
	t.assert.strictEqual(h2.tagName, 'H2')
	;[items[0], items[1]] = [items[1], items[0]]

	root.render(items)
	t.assert.strictEqual(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')
	t.assert.strictEqual(el.children[0].tagName, 'H2')
	t.assert.strictEqual(el.children[1].tagName, 'H1')

	t.assert.strictEqual(el.children[0], h2)
	t.assert.strictEqual(el.children[1], h1)
})

test('implicit keyed lists with multiple elements preserve identity when resized', (t: TestContext) => {
	const { root, el } = setup()

	const items = [
		html`<h1>Item 1</h1>`,
		html`
			<h2>Item 2</h2>
			<p>Body content</p>
		`,
	]

	root.render(items)
	t.assert.strictEqual(el.innerHTML.replace(/\s+/g, ' '), '<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')

	const [h1, h2, p] = el.children
	t.assert.strictEqual(h1.tagName, 'H1')
	t.assert.strictEqual(h2.tagName, 'H2')
	t.assert.strictEqual(p.tagName, 'P')

	// Swap
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(items)
	t.assert.strictEqual(el.innerHTML.replace(/\s+/g, ' '), ' <h2>Item 2</h2> <p>Body content</p> <h1>Item 1</h1>')
	t.assert.strictEqual(el.children[0].tagName, 'H2')
	t.assert.strictEqual(el.children[1].tagName, 'P')
	t.assert.strictEqual(el.children[2].tagName, 'H1')

	t.assert.strictEqual(el.children[0], h2)
	t.assert.strictEqual(el.children[1], p)
	t.assert.strictEqual(el.children[2], h1)

	// Swap back
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(items)
	t.assert.strictEqual(el.innerHTML.replace(/\s+/g, ' '), '<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	t.assert.strictEqual(el.children[0].tagName, 'H1')
	t.assert.strictEqual(el.children[1].tagName, 'H2')
	t.assert.strictEqual(el.children[2].tagName, 'P')
	t.assert.strictEqual(el.children[0], h1)
	t.assert.strictEqual(el.children[1], h2)
	t.assert.strictEqual(el.children[2], p)
})

test('implicit keyed renderable lists preserve identity when reordered', (t: TestContext) => {
	const { root, el } = setup()

	const items = [{ render: () => html`<h1>Item 1</h1>` }, { render: () => html`<h2>Item 2</h2>` }]

	root.render(items)
	t.assert.strictEqual(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	t.assert.strictEqual(h1.tagName, 'H1')
	t.assert.strictEqual(h2.tagName, 'H2')
	;[items[0], items[1]] = [items[1], items[0]]

	root.render(items)
	t.assert.strictEqual(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')
	t.assert.strictEqual(el.children[0].tagName, 'H2')
	t.assert.strictEqual(el.children[1].tagName, 'H1')

	t.assert.strictEqual(el.children[0], h2)
	t.assert.strictEqual(el.children[1], h1)
})

test('many items can be reordered', (t: TestContext) => {
	const { root, el } = setup()

	const items = Array.from({ length: 10 }, (_, i) => [html`<p>Item ${i}</p>`, `<p>Item ${i}</p>`])

	root.render(items.map(([item]) => item))
	t.assert.strictEqual(el.innerHTML, items.map(([, html]) => html).join(''))

	shuffle(items)

	root.render(items.map(([item]) => item))
	t.assert.strictEqual(el.innerHTML, items.map(([, html]) => html).join(''))
})

test('keying something twice throws an error', { skip: process.env.NODE_ENV === 'production' }, (t: TestContext) => {
	t.assert.doesNotThrow(() => keyed(html``, 1))
	t.assert.throws(() => keyed(keyed(html``, 1), 1))
})
