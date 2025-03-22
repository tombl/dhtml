import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createRoot, type Root } from 'dhtml/client'
import { afterEach } from 'node:test'

GlobalRegistrator.register()
globalThis.__DEV__ = process.env.NODE_ENV !== 'production'

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
