import { Root, html } from 'dhtml'
import { expect, test } from 'vitest'

test('basic-child', () => {
	const root = document.createElement('div')
	const r = Root.appendInto(root)

	r.render(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`)

	expect(root.innerHTML).toBe('<span>This is a</span> test test test')
})
