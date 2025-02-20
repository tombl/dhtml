import { html } from 'dhtml'
import { setup } from './setup'
import { expect, test } from 'vitest'

test('basic-child', () => {
	const { root, el } = setup()

	root.render(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`)

	expect(el.innerHTML).toMatchInlineSnapshot(`"<span>This is a</span> test test test"`)
})
