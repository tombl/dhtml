import { Root, html } from '../html.js'
import { assert, mockMember } from './_lib.js'

export default root => {
	const r = Root.appendInto(root)

	{
		const warn = mockMember(console, 'error', () => {})

		const recursive = {
			render() {
				return recursive

				// TODO: also error on this?
        // maybe not, given it throws a stack overflow anyway.
				// return html`<div>${recursive}</div>`
			},
		}

		try {
			r.render(recursive)
		} finally {
			warn.reset()
		}

		assert.eq(root.innerHTML, '')
		assert.eq(warn.calls.length, 1)
		assert(warn.calls[0].args.join(' ').includes('infinite recursion'))
	}

	{
		let thrown
		try {
			r.render(html`<button @click=${123}></button>`)
		} catch (error) {
			thrown = error
		}
		assert.eq(root.innerHTML, '<button></button>')
		assert(thrown instanceof Error && /expected a function/i.test(thrown.message))
	}
}
