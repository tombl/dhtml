import { assert } from './_lib.js'
import { Root, html } from 'dhtml'

export default root => {
	const r = Root.appendInto(root)

	r.render(html`<span>${'This is a'}</span> ${html`test`} ${html`test`} ${html`test`}`)

	assert.eq(root.innerHTML, '<span>This is a</span> test test test')
}
