/// <reference types="@vitest/browser/matchers" />

import { Root } from 'dhtml'
import { afterEach } from 'vitest'

const roots: Root[] = []

export function setup(initialHtml = '') {
	const el = document.createElement('div')
	el.innerHTML = initialHtml
	document.body.appendChild(el)

	const root = Root.appendInto(el)
	roots.push(root)

	return { root, el }
}

afterEach(() => {
	roots.forEach(root => root.detach())
	roots.length = 0
})
