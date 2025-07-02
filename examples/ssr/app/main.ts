import { html } from 'dhtml'
import { createRoot } from 'dhtml/client'

export const app = html`<div>Hello, world!</div>`

if (typeof window !== 'undefined') {
	createRoot(document.body).render(app)
}
