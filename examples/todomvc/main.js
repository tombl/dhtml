// @ts-check

import { html } from 'dhtml'
import { createRoot, invalidate } from 'dhtml/client'

function transition(cb) {
	if ('startViewTransition' in document) {
		document.startViewTransition(cb)
	} else {
		cb()
	}
}

function classes(...args) {
	const classes = args.flatMap(a => (a ? a.split(' ') : []))
	return node => {
		node.classList.add(...classes)
		return () => {
			node.classList.remove(...classes)
		}
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
			<li
				${classes(this.completed && 'completed', this.editing && 'editing')}
				style=${`view-transition-name: _${this.id}`}
			>
				<div class="view">
					<input
						class="toggle"
						type="checkbox"
						checked=${this.completed}
						onchange=${e => {
							e.preventDefault()
							this.completed = e.target.checked
							transition(() => {
								invalidate(this)
								invalidate(this.app)
							})
						}}
					/>
					<label
						ondblclick=${() => {
							transition(() => {
								this.editing = true
								invalidate(this)
							})
						}}
						>${this.title}</label
					>
					<button
						class="destroy"
						onclick=${() => {
							transition(() => {
								this.app.remove(this.id)
								invalidate(this.app)
							})
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
									onblur=${e => {
										const value = e.target.value.trim()
										if (value) {
											transition(() => {
												this.title = value
												this.editing = false
												invalidate(this)
											})
										}
									}}
									onkeydown=${e => {
										if (e.key === 'Enter') {
											const value = e.target.value.trim()
											if (value) {
												transition(() => {
													this.title = value
													this.editing = false
													invalidate(this)
												})
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
					onkeydown=${event => {
						if (event.key === 'Enter') {
							const value = event.target.value.trim()
							if (value) {
								transition(() => {
									this.todos.push(new TodoItem(this, value))
									event.target.value = ''
									invalidate(this)
								})
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
									checked=${activeCount === 0}
									onchange=${e => {
										transition(() => {
											for (const todo of this.todos) todo.completed = e.target.checked
											invalidate(this)
										})
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
												${classes(this.filter === filter && 'selected')}
												onclick=${() => {
													transition(() => {
														this.filter = filter
														invalidate(this)
													})
												}}
												>${filter}</a
											>
										</li>`,
								)}
							</ul>
							${completedCount > 0
								? html`<button
										class="clear-completed"
										onclick=${() => {
											transition(() => {
												this.todos = this.todos.filter(todo => !todo.completed)
												invalidate(this)
											})
										}}
									>
										Clear completed
									</button>`
								: null}
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
