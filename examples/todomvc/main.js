import { Root, html, invalidate } from '../../html.js'

function classes(node, value) {
	let prev
	update(value)
	return { update, detach: update }
	function update(value = []) {
		const added = new Set(value.filter(Boolean).flatMap(x => x.split(' ')))
		for (const name of added) {
			prev?.delete(name)
			node.classList.add(name)
		}
		for (const name of prev ?? []) {
			node.classList.remove(name)
		}
		prev = added
	}
}

const autofocus = node => node.focus()
const autoselect = node => node.setSelectionRange(0, node.value.length)

class TodoItem {
	id = crypto.randomUUID()
	completed = false
	editing = false
	constructor(app, title) {
		this.app = app
		this.title = title
	}

	render() {
		return html`
			<li ${classes}=${[this.completed && 'completed', this.editing && 'editing']}>
				<div class="view">
					<input
						class="toggle"
						type="checkbox"
						checked=${this.completed}
						@change=${e => {
							e.preventDefault()
							this.completed = e.target.checked
							invalidate(this)
						}}
					/>
					<label
						@dblclick=${() => {
							this.editing = true
							invalidate(this)
						}}
						>${this.title}</label
					>
					<button
						class="destroy"
						@click=${() => {
							this.app.remove(this.id)
							invalidate(this.app)
						}}
					></button>
				</div>
				${this.editing
					? html`
							<div class="input-container">
								<input
									class="edit"
									value=${this.title}
									${autofocus}
									${autoselect}
									@blur=${e => {
										const value = e.target.value.trim()
										if (value) {
											this.title = value
											this.editing = false
											invalidate(this)
										}
									}}
									@keydown=${e => {
										if (e.key === 'Enter') {
											const value = e.target.value.trim()
											if (value) {
												this.title = value
												this.editing = false
												invalidate(this)
											}
										}
									}}
								/>
							</div>
					  `
					: null}
			</li>
		`
	}
}

class App {
	todos = []
	get(id) {
		return this.todos.find(todo => todo.id === id)
	}
	remove(id) {
		this.todos = this.todos.filter(todo => todo.id !== id)
	}

	render() {
		return html`
			<header class="header">
				<h1>todos</h1>
				<input
					class="new-todo"
					placeholder="What needs to be done?"
					autofocus
					@keydown=${event => {
						if (event.key === 'Enter') {
							const value = event.target.value.trim()
							if (value) {
								this.todos.push(new TodoItem(this, value))
								event.target.value = ''
								invalidate(this)
							}
						}
					}}
				/>
			</header>
			${this.todos.length > 0
				? html`
						<main class="main">
							<div class="toggle-all-container">
								<input class="toggle-all" type="checkbox" checked=${this.todos.every(todo => todo.completed)} />
							</div>
							<ul class="todo-list">
								${this.todos}
							</ul>
						</main>
				  `
				: null}
		`
	}
}

const app = new App()
globalThis.app = app
document.body.addEventListener('keypress', e => {
	if (e.ctrlKey && e.key === 'i') invalidate(app)
})

app.todos.push(new TodoItem(app, 'hello'))
app.todos.push(new TodoItem(app, 'world'))

Root.appendInto(document.getElementById('root')).render(app)
