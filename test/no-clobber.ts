import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('no-clobber', () => {
	const root = document.createElement('div')
	root.appendChild(document.createElement('div')).textContent = 'before'
	const r = Root.appendInto(root)

	r.render(html`<h1>Hello, world!</h1>`)
	expect(root.innerHTML).toBe('<div>before</div><h1>Hello, world!</h1>')

	root.appendChild(document.createElement('div')).textContent = 'after'
	r.render(html`<h2>Goodbye, world!</h2>`)
	expect(root.innerHTML).toBe('<div>before</div><h2>Goodbye, world!</h2><div>after</div>')

	r.render(html``)
	expect(root.innerHTML).toBe('<div>before</div><div>after</div>')

	r.render(html`<h1>Hello, world!</h1>`)
	expect(root.innerHTML).toBe('<div>before</div><h1>Hello, world!</h1><div>after</div>')
})
