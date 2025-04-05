import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createRoot, type Root } from 'dhtml/client'

GlobalRegistrator.register()

export function setup(initial_html = ''): { root: Root; el: HTMLDivElement } {
	const el = document.createElement('div')
	el.innerHTML = initial_html
	document.body.appendChild(el)

	const root = createRoot(el)

	return { root, el }
}
