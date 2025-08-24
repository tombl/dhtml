import { html } from 'dhtml'
import { createRoot, invalidate } from 'dhtml/client'
import { computed, effect, signal } from './signals.js'

function getSystemTheme() {
	const media = window.matchMedia('(prefers-color-scheme: dark)')
	const matches = signal(media.matches)
	media.addEventListener('change', e => {
		matches(e.matches)
	})
	return computed(() => (matches() ? 'dark' : 'light'))
}

function createThemeToggle(preference, systemTheme) {
	return computed(
		() => html`
			<select
				value=${preference()}
				onchange=${e => {
					preference(e.target.value)
				}}
			>
				${['System', 'Light', 'Dark'].map(
					t => html` <option value=${t.toLowerCase()}>${t === 'System' ? `System (${systemTheme()})` : t}</option> `,
				)}
			</select>
		`,
	)
}

class App {
	preference = signal('system')
	systemTheme = getSystemTheme()
	theme = computed(() => (this.preference() === 'system' ? this.systemTheme() : this.preference))

	#themeToggle1 = createThemeToggle(this.preference, this.systemTheme)
	#themeToggle2 = createThemeToggle(this.preference, this.systemTheme)

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

effect(() => {
	if (app.preference() === 'system') {
		delete document.documentElement.dataset.theme
	} else {
		document.documentElement.dataset.theme = app.preference()
	}
})

createRoot(document.body).render(app)
