import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('basic', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	r.render(html`<h1>Hello, world!</h1>`)
	expect(root.innerHTML).toBe('<h1>Hello, world!</h1>')

	r.render(html`<h1>${html`Inner content!`}</h1>`)
	expect(root.innerHTML).toBe('<h1>Inner content!</h1>')

	const template = n => html`<h1>Hello, ${n}!</h1>`
	r.render(template(1))
	expect(root.innerHTML).toBe('<h1>Hello, 1!</h1>')
})
