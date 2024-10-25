import { Root, html } from '../../html.js'

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

function autofocus(node) {
	node.focus()
	node.setSelectionRange(0, node.value.length)
}

function item({ app, todo }) {
	return html`
		<li ${classes}=${[todo.completed && 'completed', todo.editing && 'editing']}>
			<div class="view">
				<input
					class="toggle"
					type="checkbox"
					checked=${todo.completed}
					@change=${e => {
						e.preventDefault()
						app.update(todo.id, todo => (todo.completed = e.target.checked))
					}}
				/>
				<label @dblclick=${() => app.update(todo.id, todo => (todo.editing = true))}>${todo.title}</label>
				<button class="destroy" @click=${() => app.remove(todo.id)}></button>
			</div>
			${todo.editing
				? html`
						<div class="input-container">
							<input
								class="edit"
								value=${todo.title}
								${autofocus}
								@blur=${e => {
									const value = e.target.value.trim()
									if (value) {
										app.update(todo.id, todo => {
											todo.title = value
											todo.editing = false
										})
									}
								}}
								@keydown=${e => {
									if (e.key === 'Enter') {
										const value = e.target.value.trim()
										if (value) {
											app.update(todo.id, todo => {
												todo.title = value
												todo.editing = false
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

class App {
	todos = []
	#nextId = 0
	add(title) {
		this.todos.push({
			id: this.#nextId++,
			title,
			completed: false,
			editing: false,
		})
		this.controller?.invalidate()
	}
	get(id) {
		return this.todos.find(todo => todo.id === id)
	}
	update(id, cb) {
		cb(this.get(id))
		this.controller?.invalidate()
	}
	remove(id) {
		this.todos = this.todos.filter(todo => todo.id !== id)
		this.controller?.invalidate()
	}

	render(controller) {
		this.controller = controller

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
								this.add(value)
								event.target.value = ''
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
								${this.todos.map(todo => item({ app: this, todo }))}
							</ul>
						</main>
				  `
				: null}
		`
	}
}

Root.appendInto(document.getElementById('root')).render((globalThis.app = new App()))

app.add('hello')
app.add('world')
