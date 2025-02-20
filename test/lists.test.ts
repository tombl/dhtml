import { html, type Displayable } from 'dhtml'
import { describe, expect, it } from 'vitest'
import { setup } from './setup'

function keyed<T>(renderable: T, _key: unknown) {
	return renderable
}

describe('lists', () => {
	it('basic', () => {
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
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(' <ul> <li>Before</li> <li>After</li> </ul> ')

		items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`, html`<li>Item 3</li>`]

		root.render(listOfItems())
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(
			' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li> <li>After</li> </ul> ',
		)
		const [item1, item2, item3] = el.querySelectorAll('li')

		items.push(html`<li>Item 4</li>`)
		root.render(listOfItems())
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(
			' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li> <li>After</li> </ul> ',
		)
		const [item1b, item2b, item3b] = el.querySelectorAll('li')
		expect(item1).toBe(item1b)
		expect(item2).toBe(item2b)
		expect(item3).toBe(item3b)

		items.pop()
		items.pop()
		root.render(listOfItems())
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(
			' <ul> <li>Before</li> <li>Item 1</li><li>Item 2</li> <li>After</li> </ul> ',
		)
		const [item1c, item2c] = el.querySelectorAll('li')
		expect(item1).toBe(item1c)
		expect(item2).toBe(item2c)
	})

	it('pop', () => {
		const { root, el } = setup()

		const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
		const wrapped = html`[${items}]`

		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
		const [item1, item2] = el.children

		items.pop()
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p>]')
		expect(el.children[0]).toBe(item1)
		expect(el.children[1]).toBe(item2)

		items.pop()
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 1</p>]')
		expect(el.children[0]).toBe(item1)

		items.pop()
		root.render(wrapped)
		expect(el.innerHTML).toBe('[]')
	})

	it.todo('swap', () => {
		const { root, el } = setup()

		const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
		const wrapped = html`[${items}]`

		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
		const [item1, item2, item3] = el.children

		// swap the first two items
		;[items[0], items[1]] = [items[1], items[0]]
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 2</p><p>Item 1</p><p>Item 3</p>]')
		expect(el.children[0]).toBe(item2)
		expect(el.children[1]).toBe(item1)
		expect(el.children[2]).toBe(item3)

		// swap the last two items
		;[items[1], items[2]] = [items[2], items[1]]
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 2</p><p>Item 3</p><p>Item 1</p>]')
		expect(el.children[0]).toBe(item2)
		expect(el.children[1]).toBe(item3)
		expect(el.children[2]).toBe(item1)

		// swap the first and last items
		;[items[0], items[2]] = [items[2], items[0]]
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 3</p><p>Item 2</p>]')
		expect(el.children[0]).toBe(item1)
		expect(el.children[1]).toBe(item3)
		expect(el.children[2]).toBe(item2)

		// put things back
		;[items[1], items[2]] = [items[2], items[1]]
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
		expect(el.children[0]).toBe(item1)
		expect(el.children[1]).toBe(item2)
		expect(el.children[2]).toBe(item3)
	})

	it.todo('shift', () => {
		const { root, el } = setup()

		const items = [html`<p>Item 1</p>`, html`<p>Item 2</p>`, html`<p>Item 3</p>`]
		const wrapped = html`[${items}]`

		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 1</p><p>Item 2</p><p>Item 3</p>]')
		const [, item2, item3] = el.children

		items.shift()
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 2</p><p>Item 3</p>]')
		expect(el.children[0]).toBe(item2)
		expect(el.children[1]).toBe(item3)

		items.shift()
		root.render(wrapped)
		expect(el.innerHTML).toBe('[<p>Item 3</p>]')
		expect(el.children[0]).toBe(item3)

		items.shift()
		root.render(wrapped)
		expect(el.innerHTML).toBe('[]')
	})
})

describe.todo('list reordering', () => {
	it('unkeyed', () => {
		const { root, el } = setup()

		const a = () => html`<h1>Item 1</h1>`
		const b = () => html`<h2>Item 2</h2>`

		root.render([a(), b()])
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
		expect(el.children[0].tagName).toBe('H1')
		expect(el.children[1].tagName).toBe('H2')
		const original = [...el.children]

		root.render([b(), a()])
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('H1')

		expect(el.children[0]).not.toBe(original[1])
		expect(el.children[1]).not.toBe(original[0])
	})

	it('explicit keyed', () => {
		const { root, el } = setup()

		const a = () => keyed(html`<h1>Item 1</h1>`, 1)
		const b = () => keyed(html`<h2>Item 2</h2>`, 2)

		root.render([a(), b()])
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
		expect(el.children[0].tagName).toBe('H1')
		expect(el.children[1].tagName).toBe('H2')
		const original = [...el.children]

		root.render([b(), a()])
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('H1')

		expect(el.children[0]).toBe(original[1])
		expect(el.children[1]).toBe(original[0])
	})

	it('implicit keyed', () => {
		const { root, el } = setup()

		const items = [html`<h1>Item 1</h1>`, html`<h2>Item 2</h2>`]

		root.render(items)
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
		expect(el.children[0].tagName).toBe('H1')
		expect(el.children[1].tagName).toBe('H2')
		const original = [...el.children]

		;[items[0], items[1]] = [items[1], items[0]]

		root.render(items)
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('H1')

		expect(el.children[0]).toBe(original[1])
		expect(el.children[1]).toBe(original[0])
	})

	it('implicit keyed resize', () => {
		const { root, el } = setup()

		const items = [
			html`<h1>Item 1</h1>`,
			html`
				<h2>Item 2</h2>
				<p>Body content</p>
			`,
		]

		root.render(items)
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe('<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
		expect(el.children[0].tagName).toBe('H1')
		expect(el.children[1].tagName).toBe('H2')
		expect(el.children[2].tagName).toBe('P')
		const original = [...el.children]

		// Swap
		;[items[0], items[1]] = [items[1], items[0]]
		root.render(items)
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(' <h2>Item 2</h2> <p>Body content</p> <h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('P')
		expect(el.children[2].tagName).toBe('H1')

		expect(el.children[0]).toBe(original[1])
		expect(el.children[1]).toBe(original[2])
		expect(el.children[2]).toBe(original[0])

		// Swap back
		;[items[0], items[1]] = [items[1], items[0]]
		root.render(items)
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe('<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
		expect(el.children[0].tagName).toBe('H1')
		expect(el.children[1].tagName).toBe('H2')
		expect(el.children[2].tagName).toBe('P')
		expect(el.children[0]).toBe(original[0])
		expect(el.children[1]).toBe(original[1])
		expect(el.children[2]).toBe(original[2])
	})

	it('implicit keyed renderable', () => {
		const { root, el } = setup()

		const items = [{ render: () => html`<h1>Item 1</h1>` }, { render: () => html`<h2>Item 2</h2>` }]

		root.render(items)
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')
		expect(el.children[0].tagName).toBe('H1')
		expect(el.children[1].tagName).toBe('H2')
		const original = [...el.children]

		;[items[0], items[1]] = [items[1], items[0]]

		root.render(items)
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('H1')

		expect(el.children[0]).toBe(original[1])
		expect(el.children[1]).toBe(original[0])
	})
})
