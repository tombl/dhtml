/// <reference types='vite/client' />
/// <reference types='@vitest/browser/providers/playwright' />

import '../../../reset.css'

import { createRoot, type Root } from 'dhtml/client'
import { afterEach, expect } from 'vitest'

const roots: Root[] = []

export function setup(initialHtml = ''): { root: Root; el: HTMLDivElement } {
	const state = expect.getState()
	const parentEl = document.createElement('div')
	Object.assign(parentEl.style, {
		border: '1px solid black',
		padding: '0.5em',
		margin: '0.5em',
	})
	parentEl.appendChild(document.createElement('small')).textContent = state.currentTestName ?? 'test'

	const el = document.createElement('div')
	el.innerHTML = initialHtml
	document.body.appendChild(parentEl).appendChild(el)

	const root = createRoot(el)
	roots.push(root)

	return { root, el }
}

afterEach(() => {
	roots.forEach(root => root.detach())
	roots.length = 0
})
