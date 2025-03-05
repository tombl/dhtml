import { html } from 'dhtml'
import { createRoot, invalidate } from 'dhtml/client'
import { createSubscriber, Store } from './store.js'

class ThemeToggle {
	#theme
	#preference
	constructor(theme) {
		this.theme = theme
		this.#theme = createSubscriber(
			this,
			cb => this.theme.subscribe(cb),
			() => this.theme.get(),
		)

		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
		this.#preference = createSubscriber(
			this,
			cb => {
				prefersDark.addEventListener('change', cb)
				return () => prefersDark.removeEventListener('change', cb)
			},
			() => (prefersDark.matches ? 'dark' : 'light'),
		)
	}
	render() {
		return html`
			<select
				value=${this.#theme()}
				onchange=${e => {
					this.theme.set(e.target.value)
				}}
			>
				${['System', 'Light', 'Dark'].map(
					t => html`
						<option value=${t.toLowerCase()}>${t === 'System' ? `System (${this.#preference()})` : t}</option>
					`,
				)}
			</select>
		`
	}
}

class App {
	theme = new Store('system')

	#themeToggle1 = new ThemeToggle(this.theme)
	#themeToggle2 = new ThemeToggle(this.theme)

	render() {
		return html`
			<main>
				<h1>Hello World</h1>
				${this.#themeToggle1} ${this.#themeToggle2}
			</main>
		`
	}
}

const app = new App()
globalThis.app = app
document.body.addEventListener('keypress', e => {
	if (e.ctrlKey && e.key === 'i') invalidate(app)
})

app.theme.subscribe(theme => {
	if (theme === 'system') {
		delete document.documentElement.dataset.theme
	} else {
		document.documentElement.dataset.theme = theme
	}
})

createRoot(document.body).render(app)
