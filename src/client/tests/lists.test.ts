import { test } from 'bun:test'
import { html, type Displayable } from 'dhtml'
import { keyed } from 'dhtml/client'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

const dev_test = test.skipIf(!__DEV__)

function shuffle<T>(array: T[]) {
	for (let i = 0; i < array.length; i++) {
		const j = Math.floor(Math.random() * i)
		;[array[i], array[j]] = [array[j], array[i]]
	}
}

test('basic list operations work correctly', () => {
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
	assert.equal(el.innerHTML.replace(/\s+/g, ' '), ' <ul> <li>Before</li> <li>After</li> </ul> ')

	items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`, html`<li>Item 3</li>`]

	root.render(listOfItems())
	assert.equal(
		el.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li> <li>After</li> </ul> ',
	)
	const [item1, item2, item3] = el.querySelectorAll('li')

	items.push(html`<li>Item 4</li>`)
	root.render(listOfItems())
	assert.equal(
		el.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li> <li>After</li> </ul> ',
	)
	const [item1b, item2b, item3b] = el.querySelectorAll('li')
	assert.equal(item1, item1b)
	assert.equal(item2, item2b)
	assert.equal(item3, item3b)

	items.pop()
	items.pop()
	root.render(listOfItems())
	assert.equal(
		el.innerHTML.replace(/\s+/g, ' '),
		' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li> <li>After</li> </ul> ',
	)
	const [item1c, item2c] = el.querySelectorAll('li')
	assert.equal(item1, item1c)
	assert.equal(item2, item2c)
})

test('pop operation works correctly on lists', () => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2] = el.children

	items.pop()
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 1</p><p>Item 2</p>]')
	assert.equal(el.children[0], item1)
	assert.equal(el.children[1], item2)

	items.pop()
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 1</p>]')
	assert.equal(el.children[0], item1)

	items.pop()
	root.render(wrapped)
	assert.equal(el.innerHTML, '[]')
})

test('swap operation works correctly on lists', () => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [item1, item2, item3] = el.children

	// swap the first two items
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 2</p><p>Item 1</p><p>Item 3</p>]')
	assert.equal(el.children[0], item2)
	assert.equal(el.children[1], item1)
	assert.equal(el.children[2], item3)

	// swap the last two items
	;[items[1], items[2]] = [items[2], items[1]]
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 2</p><p>Item 3</p><p>Item 1</p>]')
	assert.equal(el.children[0], item2)
	assert.equal(el.children[1], item3)
	assert.equal(el.children[2], item1)

	// swap the first and last items
	;[items[0], items[2]] = [items[2], items[0]]
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 1</p><p>Item 3</p><p>Item 2</p>]')
	assert.equal(el.children[0], item1)
	assert.equal(el.children[1], item3)
	assert.equal(el.children[2], item2)

	// put things back
	;[items[1], items[2]] = [items[2], items[1]]
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	assert.equal(el.children[0], item1)
	assert.equal(el.children[1], item2)
	assert.equal(el.children[2], item3)
})

test('shift operation works correctly on lists', () => {
	const { root, el } = setup()

	const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
	const wrapped = html`[${items}]`

	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
	const [, item2, item3] = el.children

	items.shift()
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 2</p><p>Item 3</p>]')
	assert.equal(el.children[0], item2)
	assert.equal(el.children[1], item3)

	items.shift()
	root.render(wrapped)
	assert.equal(el.innerHTML, '[<p>Item 3</p>]')
	assert.equal(el.children[0], item3)

	items.shift()
	root.render(wrapped)
	assert.equal(el.innerHTML, '[]')
})

test('full then empty then full list renders correctly', () => {
	const { root, el } = setup()

	root.render([1])
	assert.equal(el.innerHTML, '1')

	root.render([])
	assert.equal(el.innerHTML, '')

	root.render([2])
	assert.equal(el.innerHTML, '2')
})

test('list can disappear when condition changes', () => {
	const { root, el } = setup()

	const app = {
		show: true,
		render() {
			if (!this.show) return null
			return [1, 2, 3].map(i => html`<div>${i}</div>`)
		},
	}

	root.render(app)
	assert.equal(el.innerHTML, '<div>1</div><div>2</div><div>3</div>')

	app.show = false
	root.render(app)
	assert.equal(el.innerHTML, '')
})

test('unkeyed lists recreate elements when reordered', () => {
	const { root, el } = setup()

	const a = () => html`<h1>Item 1</h1>`
	const b = () => html`<h2>Item 2</h2>`

	root.render([a(), b()])
	assert.equal(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	assert.equal(h1.tagName, 'H1')
	assert.equal(h2.tagName, 'H2')

	root.render([b(), a()])
	assert.equal(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')

	// visually they should be swapped
	assert.equal(el.children[0].innerHTML, h2.innerHTML)
	assert.equal(el.children[1].innerHTML, h1.innerHTML)

	// but there's no stable identity, so they're recreated
	assert.notStrictEqual(el.children[0], h2)
	assert.notStrictEqual(el.children[1], h1)
})

test('explicit keyed lists preserve identity when reordered', () => {
	const { root, el } = setup()

	const a = () => keyed(html`<h1>Item 1</h1>`, 1)
	const b = () => keyed(html`<h2>Item 2</h2>`, 2)

	root.render([a(), b()])
	assert.equal(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	assert.equal(h1.tagName, 'H1')
	assert.equal(h2.tagName, 'H2')

	root.render([b(), a()])
	assert.equal(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')

	assert.equal(el.children[0], h2)
	assert.equal(el.children[1], h1)
})

test('implicit keyed lists preserve identity when reordered', () => {
	const { root, el } = setup()

	const items = [html`<h1>Item 1</h1>`, html`<h2>Item 2</h2>`]

	root.render(items)
	assert.equal(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	assert.equal(h1.tagName, 'H1')
	assert.equal(h2.tagName, 'H2')
	;[items[0], items[1]] = [items[1], items[0]]

	root.render(items)
	assert.equal(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')
	assert.equal(el.children[0].tagName, 'H2')
	assert.equal(el.children[1].tagName, 'H1')

	assert.equal(el.children[0], h2)
	assert.equal(el.children[1], h1)
})

test('implicit keyed lists with multiple elements preserve identity when resized', () => {
	const { root, el } = setup()

	const items = [
		html`<h1>Item 1</h1>`,
		html`
			<h2>Item 2</h2>
			<p>Body content</p>
		`,
	]

	root.render(items)
	assert.equal(el.innerHTML.replace(/\s+/g, ' '), '<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')

	const [h1, h2, p] = el.children
	assert.equal(h1.tagName, 'H1')
	assert.equal(h2.tagName, 'H2')
	assert.equal(p.tagName, 'P')

	// Swap
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(items)
	assert.equal(el.innerHTML.replace(/\s+/g, ' '), ' <h2>Item 2</h2> <p>Body content</p> <h1>Item 1</h1>')
	assert.equal(el.children[0].tagName, 'H2')
	assert.equal(el.children[1].tagName, 'P')
	assert.equal(el.children[2].tagName, 'H1')

	assert.equal(el.children[0], h2)
	assert.equal(el.children[1], p)
	assert.equal(el.children[2], h1)

	// Swap back
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(items)
	assert.equal(el.innerHTML.replace(/\s+/g, ' '), '<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
	assert.equal(el.children[0].tagName, 'H1')
	assert.equal(el.children[1].tagName, 'H2')
	assert.equal(el.children[2].tagName, 'P')
	assert.equal(el.children[0], h1)
	assert.equal(el.children[1], h2)
	assert.equal(el.children[2], p)
})

test('implicit keyed renderable lists preserve identity when reordered', () => {
	const { root, el } = setup()

	const items = [{ render: () => html`<h1>Item 1</h1>` }, { render: () => html`<h2>Item 2</h2>` }]

	root.render(items)
	assert.equal(el.innerHTML, '<h1>Item 1</h1><h2>Item 2</h2>')

	const [h1, h2] = el.children
	assert.equal(h1.tagName, 'H1')
	assert.equal(h2.tagName, 'H2')
	;[items[0], items[1]] = [items[1], items[0]]

	root.render(items)
	assert.equal(el.innerHTML, '<h2>Item 2</h2><h1>Item 1</h1>')
	assert.equal(el.children[0].tagName, 'H2')
	assert.equal(el.children[1].tagName, 'H1')

	assert.equal(el.children[0], h2)
	assert.equal(el.children[1], h1)
})

test('many items can be reordered', () => {
	const { root, el } = setup()

	const items = Array.from({ length: 10 }, (_, i) => [html`<p>Item ${i}</p>`, `<p>Item ${i}</p>`])

	root.render(items.map(([item]) => item))
	assert.equal(el.innerHTML, items.map(([, html]) => html).join(''))

	shuffle(items)

	root.render(items.map(([item]) => item))
	assert.equal(el.innerHTML, items.map(([, html]) => html).join(''))
})

dev_test('keying something twice throws an error', () => {
	assert.doesNotThrow(() => keyed(html``, 1))
	assert.throws(() => keyed(keyed(html``, 1), 1))
})
