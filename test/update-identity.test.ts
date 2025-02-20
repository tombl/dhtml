import { html, type Displayable } from 'dhtml'
import { expect, test } from 'vitest'
import { setup } from './setup'

test('update-identity', () => {
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
