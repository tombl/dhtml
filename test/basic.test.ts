import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test('basic', () => {
	const { root, el } = setup()

	root.render(html`<h1>Hello, world!</h1>`)
	expect(el.innerHTML).toBe('<h1>Hello, world!</h1>')

	root.render(html`<h1>${html`Inner content!`}</h1>`)
	expect(el.innerHTML).toBe('<h1>Inner content!</h1>')

	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`
	root.render(template(1))
	expect(el.innerHTML).toBe('<h1>Hello, 1!</h1>')
})
