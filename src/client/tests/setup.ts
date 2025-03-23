import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterAll } from 'bun:test'
import { createRoot, type Root } from 'dhtml/client'

GlobalRegistrator.register()

export function setup(initialHtml = ''): { root: Root; el: HTMLDivElement } {
	const el = document.createElement('div')
	el.innerHTML = initialHtml
	document.body.appendChild(el)

	const root = createRoot(el)

	afterAll(() => root.detach())

	return { root, el }
}
