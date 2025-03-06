import { html, type Displayable } from 'dhtml'
import { describe, expect, it, vi } from 'vitest'
import { setup } from './setup'

describe('basic', () => {
	it('should render basic html', () => {
		const { root, el } = setup()

		root.render(html`<h1>Hello, world!</h1>`)
		expect(el.innerHTML).toBe('<h1>Hello, world!</h1>')
	})

	it('should render inner content', () => {
		const { root, el } = setup()

		root.render(html`<h1>${html`Inner content!`}</h1>`)
		expect(el.innerHTML).toBe('<h1>Inner content!</h1>')
	})

	it('should render template with number', () => {
		const { root, el } = setup()

		const template = (n: number) => html`<h1>Hello, ${n}!</h1>`

		root.render(template(1))
		expect(el.innerHTML).toBe('<h1>Hello, 1!</h1>')

		root.render(template(2))
		expect(el.innerHTML).toBe('<h1>Hello, 2!</h1>')
	})

	it('should not clobber external sibling nodes', () => {
		const { root, el } = setup('<div>before</div>')

		root.render(html`<h1>Hello, world!</h1>`)
		expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><h1>Hello, world!</h1>"`)

		el.appendChild(document.createElement('div')).textContent = 'after'
		expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><h1>Hello, world!</h1><div>after</div>"`)

		root.render(html`<h2>Goodbye, world!</h2>`)
		expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><h2>Goodbye, world!</h2><div>after</div>"`)

		root.render(html``)
		expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><div>after</div>"`)

		root.render(html`<h1>Hello, world!</h1>`)
		expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><h1>Hello, world!</h1><div>after</div>"`)
	})

	it('update identity', () => {
		const { root, el } = setup()

		const template = (n: Displayable) => html`<h1>Hello, ${n}!</h1>`
		const template2 = (n: Displayable) => html`<h1>Hello, ${n}!</h1>`

		root.render(template(1))
		expect(el.innerHTML).toMatchInlineSnapshot(`"<h1>Hello, 1!</h1>"`)
		let h1 = el.children[0]
		const text = h1.childNodes[1] as Text
		expect(text).toBeInstanceOf(Text)
		expect(text.data).toBe('1')

		root.render(template(2))
		expect(el.innerHTML).toMatchInlineSnapshot(`"<h1>Hello, 2!</h1>"`)
		expect(el.children[0]).toBe(h1)
		expect(text.data).toBe('2')
		expect(h1.childNodes[1]).toBe(text)

		root.render(template2(3))
		expect(el.innerHTML).toMatchInlineSnapshot(`"<h1>Hello, 3!</h1>"`)
		expect(el.children[0]).not.toBe(h1)
		h1 = el.children[0]

		root.render(template2(template(template('inner'))))
		expect(el.innerHTML).toMatchInlineSnapshot(`"<h1>Hello, <h1>Hello, <h1>Hello, inner!</h1>!</h1>!</h1>"`)
		expect(el.children[0]).toBe(h1)
	})

	it('basic children', () => {
		const { root, el } = setup()

		root.render(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`)

		expect(el.innerHTML).toMatchInlineSnapshot(`"<span>This is a</span> test test test"`)
	})

	it('can embed nodes', () => {
		const { root, el } = setup()

		let node: ParentNode = document.createElement('span')

		root.render(html`<div>${node}</div>`)
		expect(el.innerHTML).toBe('<div><span></span></div>')
		expect(el.children[0].children[0]).toBe(node)

		node = document.createDocumentFragment()
		node.append(document.createElement('h1'), document.createElement('h2'), document.createElement('h3'))

		root.render(html`<div>${node}</div>`)
		expect(el.innerHTML).toBe('<div><h1></h1><h2></h2><h3></h3></div>')
		expect(node.children.length).toBe(0)
	})

	it.todo('does not add extra empty text nodes', () => {
		const { root, el } = setup()

		root.render(html`${'abc'}`)
		expect(el.childNodes.length).toBe(1)
		expect(el.firstChild).toBeInstanceOf(Text)
		expect((el.firstChild as Text).data).toBe('abc')
	})

	it('shifting ChildPart index', () => {
		const { root, el } = setup()

		root.render(html`${html`A<!--x-->`}B${'C'}`)

		expect(el.innerHTML).toBe('A<!--x-->BC')
	})
})

describe('errors', () => {
	it('throws cleanly', () => {
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
		expect(thrown).toBe(oops)

		// on an error, don't leave any visible artifacts
		expect(el.innerHTML).toBe('<!---->')
	})

	it('warns on invalid part placement', { skip: import.meta.env.PROD }, () => {
		const { root, el } = setup()

		expect(() => root.render(html`<${'div'}>${'text'}</${'div'}>`)).toThrowErrorMatchingInlineSnapshot(
			`[Error: expected the same number of dynamics as parts. do you have a \${...} in an unsupported place?]`,
		)
		expect(el.innerHTML).toBe('')
	})

	it('does not throw on parts in comments', () => {
		const { root, el } = setup()

		root.render(html`<!-- ${'text'} -->`)
		expect(el.innerHTML).toMatchInlineSnapshot(`"<!-- dyn-$0$ -->"`)
	})

	it('throws when manually specifying internal template syntax', { skip: import.meta.env.PROD }, () => {
		const { root, el } = setup()

		expect(() => {
			root.render(html`${1} dyn-$0$`)
		}).toThrowErrorMatchingInlineSnapshot(`[Error: got more parts than expected]`)

		expect(el.innerHTML).toMatchInlineSnapshot(`""`)
	})

	it('does not throw when syntax is close but not exact', () => {
		const { root, el } = setup()

		root.render(html`dyn-$${0}1$`)

		expect(el.innerHTML).toMatchInlineSnapshot(`"dyn-$01$"`)
	})
})
