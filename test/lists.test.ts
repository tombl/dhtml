import { html, keyed, type Displayable } from 'dhtml'
import { describe, expect, it } from 'vitest'
import { setup } from './setup'

function shuffle<T>(array: T[]) {
	for (let i = 0; i < array.length; i++) {
		const j = Math.floor(Math.random() * i)
		;[array[i], array[j]] = [array[j], array[i]]
	}
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

	it('swap', () => {
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

	it('shift', () => {
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

	it('full then empty then full', () => {
		const { root, el } = setup()

		root.render([1])
		expect(el.innerHTML).toBe('1')

		root.render([])
		expect(el.innerHTML).toBe('')

		root.render([2])
		expect(el.innerHTML).toBe('2')
	})

	it('can disappear', () => {
		const { root, el } = setup()

		const app = {
			show: true,
			render() {
				if (!this.show) return null
				return [1, 2, 3].map(i => html`<div>${i}</div>`)
			},
		}

		root.render(app)
		expect(el.innerHTML).toMatchInlineSnapshot(`"<div>1</div><div>2</div><div>3</div>"`)

		app.show = false
		root.render(app)
		expect(el.innerHTML).toMatchInlineSnapshot(`""`)
	})
})

describe('list reordering', () => {
	it('unkeyed', () => {
		const { root, el } = setup()

		const a = () => html`<h1>Item 1</h1>`
		const b = () => html`<h2>Item 2</h2>`

		root.render([a(), b()])
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')

		const [h1, h2] = el.children
		expect(h1.tagName).toBe('H1')
		expect(h2.tagName).toBe('H2')

		root.render([b(), a()])
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')

		// visually they should be swapped
		expect(el.children[0]).toEqual(h2)
		expect(el.children[1]).toEqual(h1)

		// but there's no stable identity, so they're recreated
		expect(el.children[0]).not.toBe(h2)
		expect(el.children[1]).not.toBe(h1)
	})

	it('explicit keyed', () => {
		const { root, el } = setup()

		const a = () => keyed(html`<h1>Item 1</h1>`, 1)
		const b = () => keyed(html`<h2>Item 2</h2>`, 2)

		root.render([a(), b()])
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')

		const [h1, h2] = el.children
		expect(h1.tagName).toBe('H1')
		expect(h2.tagName).toBe('H2')

		root.render([b(), a()])
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')

		expect(el.children[0]).toBe(h2)
		expect(el.children[1]).toBe(h1)
	})

	it('implicit keyed', () => {
		const { root, el } = setup()

		const items = [html`<h1>Item 1</h1>`, html`<h2>Item 2</h2>`]

		root.render(items)
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')

		const [h1, h2] = el.children
		expect(h1.tagName).toBe('H1')
		expect(h2.tagName).toBe('H2')
		;[items[0], items[1]] = [items[1], items[0]]

		root.render(items)
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('H1')

		expect(el.children[0]).toBe(h2)
		expect(el.children[1]).toBe(h1)
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

		const [h1, h2, p] = el.children
		expect(h1.tagName).toBe('H1')
		expect(h2.tagName).toBe('H2')
		expect(p.tagName).toBe('P')

		// Swap
		;[items[0], items[1]] = [items[1], items[0]]
		root.render(items)
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe(' <h2>Item 2</h2> <p>Body content</p> <h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('P')
		expect(el.children[2].tagName).toBe('H1')

		expect(el.children[0]).toBe(h2)
		expect(el.children[1]).toBe(p)
		expect(el.children[2]).toBe(h1)

		// Swap back
		;[items[0], items[1]] = [items[1], items[0]]
		root.render(items)
		expect(el.innerHTML.replace(/\s+/g, ' ')).toBe('<h1>Item 1</h1> <h2>Item 2</h2> <p>Body content</p> ')
		expect(el.children[0].tagName).toBe('H1')
		expect(el.children[1].tagName).toBe('H2')
		expect(el.children[2].tagName).toBe('P')
		expect(el.children[0]).toBe(h1)
		expect(el.children[1]).toBe(h2)
		expect(el.children[2]).toBe(p)
	})

	it('implicit keyed renderable', () => {
		const { root, el } = setup()

		const items = [{ render: () => html`<h1>Item 1</h1>` }, { render: () => html`<h2>Item 2</h2>` }]

		root.render(items)
		expect(el.innerHTML).toBe('<h1>Item 1</h1><h2>Item 2</h2>')

		const [h1, h2] = el.children
		expect(h1.tagName).toBe('H1')
		expect(h2.tagName).toBe('H2')
		;[items[0], items[1]] = [items[1], items[0]]

		root.render(items)
		expect(el.innerHTML).toBe('<h2>Item 2</h2><h1>Item 1</h1>')
		expect(el.children[0].tagName).toBe('H2')
		expect(el.children[1].tagName).toBe('H1')

		expect(el.children[0]).toBe(h2)
		expect(el.children[1]).toBe(h1)
	})

	it('reorders many items', () => {
		const { root, el } = setup()

		const items = Array.from({ length: 10 }, (_, i) => [html`<p>Item ${i}</p>`, `<p>Item ${i}</p>`])

		root.render(items.map(([item]) => item))
		expect(el.innerHTML).toBe(items.map(([, html]) => html).join(''))

		shuffle(items)
		// items.reverse()

		root.render(items.map(([item]) => item))
		expect(el.innerHTML).toBe(items.map(([, html]) => html).join(''))
	})
})

describe('list with keys', { skip: import.meta.env.PROD }, () => {
	it("can't key something twice", () => {
		expect(() => keyed(html``, 1)).not.toThrow()
		expect(() => keyed(keyed(html``, 1), 1)).toThrow()
	})
})
