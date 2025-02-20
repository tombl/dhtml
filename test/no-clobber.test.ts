import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test('no-clobber', () => {
	const { root, el } = setup('<div>before</div>')

	root.render(html`<h1>Hello, world!</h1>`)
	expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><h1>Hello, world!</h1>"`)

	el.appendChild(document.createElement('div')).textContent = 'after'
	root.render(html`<h2>Goodbye, world!</h2>`)
	expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><h2>Goodbye, world!</h2><div>after</div>"`)

	root.render(html``)
	expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><div>after</div>"`)

	root.render(html`<h1>Hello, world!</h1>`)
	expect(el.innerHTML).toMatchInlineSnapshot(`"<div>before</div><h1>Hello, world!</h1><div>after</div>"`)
})
