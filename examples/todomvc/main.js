import { createRoot, html, invalidate } from 'dhtml'

function classes(node, value) {
	let prev = new Set()
	update(value)
	return { update, detach: update }
	function update(value = []) {
		if (!Array.isArray(value)) value = [value]
		const added = new Set(value.filter(Boolean).flatMap(x => x.split(' ')))
		for (const name of added) {
			prev.delete(name)
			node.classList.add(name)
		}
		for (const name of prev) {
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
						.checked=${this.completed}
						@change=${e => {
							e.preventDefault()
							this.completed = e.target.checked
							invalidate(this.app)
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

	filter = 'All'
	render() {
		const completedCount = this.todos.filter(todo => todo.completed).length
		const activeCount = this.todos.length - completedCount

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
								<input
									class="toggle-all"
									id="toggle-all"
									type="checkbox"
									.checked=${activeCount === 0}
									@change=${e => {
										for (const todo of this.todos) todo.completed = e.target.checked
										invalidate(this)
									}}
								/>
								<label class="toggle-all-label" for="toggle-all">Toggle All Input</label>
							</div>
							<ul class="todo-list">
								${this.todos.filter(todo => {
									switch (this.filter) {
										case 'Active':
											return !todo.completed
										case 'Completed':
											return todo.completed
										case 'All':
											return true
									}
								})}
							</ul>
						</main>
						<footer class="footer">
							<span class="todo-count">${activeCount} ${activeCount === 1 ? 'item' : 'items'} left</span>
							<ul class="filters">
								${['All', 'Active', 'Completed'].map(
									filter =>
										html`<li>
											<a
												href="#"
												${classes}=${this.filter === filter && 'selected'}
												@click=${() => {
													this.filter = filter
													invalidate(this)
												}}
												>${filter}</a
											>
										</li>`,
								)}
							</ul>
							${completedCount > 0 ? html`<button class="clear-completed">Clear completed</button>` : null}
						</footer>
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

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')
createRoot(rootEl).render(app)
