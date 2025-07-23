import { createRoot, type Root } from 'dhtml/client'

export function setup(initial_html = ''): { root: Root; el: HTMLDivElement } {
	const el = document.createElement('div')
	el.innerHTML = initial_html
	document.body.appendChild(el)

	const root = createRoot(el)

	// afterAll(() => root.render(null))

	return { root, el }
}
