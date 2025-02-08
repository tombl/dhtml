import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('update-identity', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	const template = n => html`<h1>Hello, ${n}!</h1>`
	const template2 = n => html`<h1>Hello, ${n}!</h1>`

	r.render(template(1))
	expect(root.innerHTML).toBe('<h1>Hello, 1!</h1>')
	let h1 = root.children[0]
	const text = h1.childNodes[1]
	expect(text).instanceOf(Text)
	expect(text.textContent).toBe('1')

	r.render(template(2))
	expect(root.innerHTML).toBe('<h1>Hello, 2!</h1>')
	expect(root.children[0]).toBe(h1)
	expect(text.textContent).toBe('2')
	expect(h1.childNodes[1]).toBe(text)

	r.render(template2(3))
	expect(root.innerHTML).toBe('<h1>Hello, 3!</h1>')
	expect(root.children[0]).not.toBe(h1)
	h1 = root.children[0]

	r.render(template2(template(template('inner'))))
	expect(root.innerHTML).toBe('<h1>Hello, <h1>Hello, <h1>Hello, inner!</h1>!</h1>!</h1>')
	expect(root.children[0]).toBe(h1)
})
