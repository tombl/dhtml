#!/usr/bin/env -S bun run --define __DEV__=false
import { html } from 'dhtml'
import { bench, run } from 'mitata'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

bench('basic', () => {
	const { el, root } = setup()
	root.render(html`<p>Hello!</p>`)
	assert.equal(el.innerHTML, '<p>Hello!</p>')
})

await run()
