import { test } from 'bun:test'
import { html } from 'dhtml'
import { injectToStream, renderToReadableStream, renderToString } from 'dhtml/server'
import assert from 'node:assert/strict'

test('injectToStream', async () => {
	const loading = {
		render() {
			const id = 'abc'
			injectToStream(
				this,
				html`
					<div>Loaded</div>
					<script>
						${`${id}.replaceWith(document.currentScript.previousElementSibling)`}
					</script>
				`,
			)
			throw html`<span id=${id}>Loading...</span>`
		},
	}

	const expected = `<main><span id="abc">Loading...</span></main> <div>Loaded</div> <script>
						abc.replaceWith(document.currentScript.previousElementSibling)
					</script> `
	assert.equal(await renderToString(html`<main>${loading}</main>`), expected)

	const stream = renderToReadableStream(html`<main>${loading}</main>`)
	assert.equal(await new Response(stream).text(), expected)
})
