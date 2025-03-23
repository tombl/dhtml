import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterEach } from 'bun:test'
import { createRoot, type Root } from 'dhtml/client'

GlobalRegistrator.register()

const roots: Root[] = []

export function setup(initialHtml = ''): { root: Root; el: HTMLDivElement } {
	const el = document.createElement('div')
	el.innerHTML = initialHtml
	document.body.appendChild(el)

	const root = createRoot(el)
	roots.push(root)

	return { root, el }
}

afterEach(() => {
	roots.forEach(root => root.detach())
	roots.length = 0
})
