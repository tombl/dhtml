import { html, type Displayable, type Renderable } from 'dhtml'
import { attr, hydrate, invalidate, keyed, type Directive, type Root } from 'dhtml/client'
import { renderToString } from 'dhtml/server'
import { assert, assert_deep_eq, assert_eq, test } from '../../../scripts/test/test.ts'

let phase: 'server' | 'client' | null = null

function setup(template: Displayable): { root: Root; el: HTMLDivElement } {
	const el = document.createElement('div')
	phase = 'server'
	el.innerHTML = renderToString(template)
	document.body.appendChild(el)

	phase = 'client'
	const root = hydrate(el, template)

	phase = null
	return { root, el }
}

// Basic Hydration Tests
test('basic html hydrates correctly', () => {
	const { root, el } = setup(html`<h1>Hello, world!</h1>`)

	assert_eq(el.innerHTML, '<!--?[--><h1>Hello, world!</h1><!--?]-->')

	// Test that subsequent renders work
	root.render(html`<h2>Updated!</h2>`)
	assert_eq(el.innerHTML, '<!--?[--><h2>Updated!</h2><!--?]-->')
})

test('dynamic content hydrates correctly', () => {
	const template = (n: number) => html`<h1>Hello, ${n}!</h1>`
	const { root, el } = setup(template(42))

	assert_eq(el.innerHTML, '<!--?[--><h1>Hello, <!--?[-->42<!--?]-->!</h1><!--?]-->')

	// Test dynamic updates
	root.render(template(84))
	assert_eq(el.innerHTML, '<!--?[--><h1>Hello, <!--?[-->84<!--?]-->!</h1><!--?]-->')
})

test('nested templates hydrate correctly', () => {
	const { root, el } = setup(html`<h1>${html`Inner content!`}</h1>`)

	assert_eq(el.innerHTML, '<!--?[--><h1><!--?[-->Inner content!<!--?]--></h1><!--?]-->')

	// Test updates to nested content
	root.render(html`<h1>${html`Updated inner!`}</h1>`)
	assert_eq(el.innerHTML, '<!--?[--><h1>Updated inner!</h1><!--?]-->')
})

test('multiple dynamic values hydrate correctly', () => {
	const { el } = setup(html`<span>${'This is a'}</span> ${html`test`} ${html`with`} ${html`parts`}`)

	assert_eq(
		el.innerHTML,
		'<!--?[--><span><!--?[-->This is a<!--?]--></span> <!--?[-->test<!--?]--> <!--?[-->with<!--?]--> <!--?[-->parts<!--?]--><!--?]-->',
	)
})

// Attribute & Property Tests
test('static attributes hydrate correctly', () => {
	const { el } = setup(html`<h1 class="title">Hello, world!</h1>`)

	assert_eq(el.querySelector('h1')!.className, 'title')
})

test('dynamic attributes hydrate correctly', () => {
	const { root, el } = setup(html`<h1 style=${'color: red'}>Hello, world!</h1>`)

	assert_eq(el.querySelector('h1')!.getAttribute('style'), 'color: red;')

	// Test attribute updates
	root.render(html`<h1 style=${'color: blue'}>Hello, world!</h1>`)
	assert_eq(el.querySelector('h1')!.getAttribute('style'), 'color: blue;')
})

test('boolean attributes hydrate correctly', () => {
	const { root, el } = setup(html`<details open=${true}></details>`)

	assert(el.querySelector('details')!.open)

	// Test boolean attribute toggle
	root.render(html`<details open=${false}></details>`)
	assert(!el.querySelector('details')!.open)
})

test('property attributes hydrate correctly', () => {
	const innerHTML = '<span>Hello!</span>'
	const { el } = setup(html`<div innerHTML=${innerHTML}></div>`)

	// assert(!el.querySelector('div')!.hasAttribute('innerHTML'))
	assert_eq(el.querySelector('div')!.innerHTML, innerHTML)
})

test('event handlers hydrate correctly', () => {
	let clicks = 0
	const { el } = setup(html`
		<button
			onclick=${() => {
				clicks++
			}}
		>
			Click me
		</button>
	`)

	assert_eq(clicks, 0)
	el.querySelector('button')!.click()
	assert_eq(clicks, 1)
})

test('data attributes hydrate correctly', () => {
	const { el } = setup(html`<h1 data-foo=${'bar'}>Hello, world!</h1>`)

	assert_eq(el.querySelector('h1')!.dataset.foo, 'bar')
})

test('class and for attributes hydrate correctly', () => {
	const { el } = setup(html`
		<label for=${'test-input'} class=${'label-class'}>Label</label>
		<input id="test-input" />
	`)

	assert_eq(el.querySelector('label')!.htmlFor, 'test-input')
	assert_eq(el.querySelector('label')!.className, 'label-class')
})

// List & Array Hydration Tests
test('basic arrays hydrate correctly', () => {
	const items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`, html`<li>Item 3</li>`]
	const template = () => html`
		<ul>
			${items}
		</ul>
	`
	const { root, el } = setup(template())

	assert_eq(
		el.innerHTML,
		'<!--?[--> <ul> <!--?[--><!--?[--><li>Item 1</li><!--?]--><!--?[--><li>Item 2</li><!--?]--><!--?[--><li>Item 3</li><!--?]--><!--?]--> </ul> <!--?]-->',
	)

	// Test adding items
	items.push(html`<li>Item 4</li>`)
	root.render(template())
	assert_eq(
		el.innerHTML,
		'<!--?[--> <ul> <!--?[--><!--?[--><li>Item 1</li><!--?]--><!--?[--><li>Item 2</li><!--?]--><!--?[--><li>Item 3</li><!--?]--><li>Item 4</li><!--?]--> </ul> <!--?]-->',
	)
})

test('empty to populated arrays hydrate correctly', () => {
	let items: Displayable[] = []
	const template = () => html`
		<ul>
			${items}
		</ul>
	`
	const { root, el } = setup(template())

	assert_eq(el.innerHTML, '<!--?[--> <ul> <!--?[--><!--?]--> </ul> <!--?]-->')

	// Add items
	items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`]
	root.render(template())
	assert_eq(el.innerHTML, '<!--?[--> <ul> <!--?[--><li>Item 1</li><li>Item 2</li><!--?]--> </ul> <!--?]-->')
})

test('keyed lists preserve identity during hydration', () => {
	const items = [keyed(html`<li>Item 1</li>`, 'a'), keyed(html`<li>Item 2</li>`, 'b')]
	const template = () => html`
		<ul>
			${items}
		</ul>
	`
	const { root, el } = setup(template())

	const [li1, li2] = el.querySelectorAll('li')

	// Swap items
	items.reverse()
	root.render(template())
	assert_eq(
		el.innerHTML,
		'<!--?[--> <ul> <!--?[--><!--?[--><li>Item 2</li><!--?]--><!--?[--><li>Item 1</li><!--?]--><!--?]--> </ul> <!--?]-->',
	)

	// Elements should maintain identity
	assert_eq(el.querySelectorAll('li')[0], li2)
	assert_eq(el.querySelectorAll('li')[1], li1)
})

test('implicit keyed lists preserve identity during hydration', () => {
	const items = [html`<li>Item 1</li>`, html`<li>Item 2</li>`]
	const template = () => html`
		<ul>
			${items}
		</ul>
	`
	const { root, el } = setup(template())

	const [li1, li2] = el.querySelectorAll('li')

	// Swap items
	;[items[0], items[1]] = [items[1], items[0]]
	root.render(template())
	assert_eq(
		el.innerHTML,
		'<!--?[--> <ul> <!--?[--><!--?[--><li>Item 2</li><!--?]--><!--?[--><li>Item 1</li><!--?]--><!--?]--> </ul> <!--?]-->',
	)

	// Elements should maintain identity
	assert_eq(el.querySelectorAll('li')[0], li2)
	assert_eq(el.querySelectorAll('li')[1], li1)
})

test('mixed content arrays hydrate correctly', () => {
	const { el } = setup([1, 'text', html`<span>element</span>`])
	assert_eq(
		el.innerHTML,
		'<!--?[--><!--?[-->1<!--?]--><!--?[-->text<!--?]--><!--?[--><span>element</span><!--?]--><!--?]-->',
	)
})

// Directive Hydration Tests
test('simple directives hydrate correctly', () => {
	const redifier: Directive = node => {
		if (!(node instanceof HTMLElement)) throw new Error('expected HTMLElement')
		node.style.color = 'red'
		return () => {
			node.style.color = ''
		}
	}

	const template = (directive: Directive | null) => html`<div ${directive}>Hello, world!</div>`
	const { root, el } = setup(template(redifier))

	const div = el.querySelector('div')!
	assert_eq(div.style.cssText, 'color: red;')

	root.render(template(null))
	assert_eq(div.style.cssText, '')
})

test('attr directive hydrates correctly', () => {
	const template = (value: string) => html`<label ${attr('for', value)}>Label</label>`
	const { root, el } = setup(template('test-input'))

	assert_eq(el.querySelector('label')!.htmlFor, 'test-input')

	root.render(template('updated-input'))
	assert_eq(el.querySelector('label')!.htmlFor, 'updated-input')
})

test('directives with parameters hydrate correctly', () => {
	function classes(value: string[]): Directive {
		const values = value.filter(Boolean)
		return node => {
			node.classList.add(...values)
			return () => {
				node.classList.remove(...values)
			}
		}
	}

	const { el } = setup(html`<div class="base" ${classes(['a', 'b'])}>Hello</div>`)

	assert_eq(el.querySelector('div')!.className, 'base a b')
})

// Renderable Component Tests
test('basic renderables hydrate correctly', () => {
	const { el } = setup({
		render() {
			return html`<h1>Component content</h1>`
		},
	})

	assert_eq(el.innerHTML, '<!--?[--><h1>Component content</h1><!--?]-->')
})

test('renderables with state hydrate correctly', () => {
	const counter = {
		count: 0,
		render() {
			return html`<div>Count: ${this.count}</div>`
		},
	}

	const { el } = setup(counter)

	assert_eq(el.innerHTML, '<!--?[--><div>Count: <!--?[-->0<!--?]--></div><!--?]-->')

	// Test state updates
	counter.count = 5
	invalidate(counter)
	assert_eq(el.innerHTML, '<!--?[--><div>Count: <!--?[-->5<!--?]--></div><!--?]-->')
})

test('nested renderables hydrate correctly', () => {
	const inner = {
		render() {
			return html`<span>Inner</span>`
		},
	}

	const outer = {
		render() {
			return html`<div>Outer: ${inner}</div>`
		},
	}

	const { el } = setup(outer)

	assert_eq(el.innerHTML, '<!--?[--><div>Outer: <!--?[--><span>Inner</span><!--?]--></div><!--?]-->')
})

test('renderables with lifecycle hooks hydrate correctly', () => {
	const sequence: string[] = []

	const app = {
		render() {
			sequence.push(`render ${phase}`)
			return html`<div>Component</div>`
		},
	}

	const { root, el } = setup(app)

	assert_eq(el.innerHTML, '<!--?[--><div>Component</div><!--?]-->')
	assert_deep_eq(sequence, [
		'render server', // render on the server
		'render client', // render on the client for hydration
		'render client', // rerender on the client
	])

	// Test cleanup
	sequence.length = 0
	root.render(null)
	assert_deep_eq(sequence, ['cleanup'])
})

test('renderables that throw work correctly during hydration', () => {
	const app = {
		render() {
			throw html`<div>Thrown content</div>`
		},
	}

	const { el } = setup(app)

	assert_eq(el.innerHTML, '<!--?[--><div>Thrown content</div><!--?]-->')
})

// Advanced Hydration Scenarios
test('deeply nested templates hydrate correctly', () => {
	const { el } = setup(html`
		<div class="outer">
			<section>
				<header>${html`<h1>Title</h1>`}</header>
				<main>
					${html`
						<article>
							<p>Content with ${html`<strong>emphasis</strong>`}</p>
						</article>
					`}
				</main>
			</section>
		</div>
	`)

	assert(el.querySelector('.outer'))
	assert(el.querySelector('h1'))
	assert(el.querySelector('strong'))
	assert_eq(el.querySelector('h1')!.textContent, 'Title')
	assert_eq(el.querySelector('strong')!.textContent, 'emphasis')
})

test('templates with comments and whitespace hydrate correctly', () => {
	const { el } = setup(html`
		<div>
			<!-- This is a comment -->
			<p>Content</p>
			<!-- Another comment -->
		</div>
	`)

	assert(el.querySelector('p'))
	assert_eq(el.querySelector('p')!.textContent, 'Content')
})

test('mixed static and dynamic content hydrates correctly', () => {
	const { el } = setup(html`
		<div>
			<p>Hello, ${'World'}!</p>
			<p>This is static</p>
			<p>Count: ${42}</p>
		</div>
	`)

	const paragraphs = el.querySelectorAll('p')
	assert_eq(paragraphs.length, 3)
	assert_eq(paragraphs[0].textContent, 'Hello, World!')
	assert_eq(paragraphs[1].textContent, 'This is static')
	assert_eq(paragraphs[2].textContent, 'Count: 42')
})

test('hydration preserves existing sibling nodes', () => {
	const server_html = renderToString(html`<h1>Hydrated content</h1>`)

	const el = document.createElement('div')
	el.innerHTML = `<div>before</div>${server_html}<div>after</div>`
	document.body.appendChild(el)

	const root = hydrate(el, html`<h1>Hydrated content</h1>`)

	assert_eq(el.innerHTML, '<div>before</div><!--?[--><h1>Hydrated content</h1><!--?]--><div>after</div>')

	// Test that updates don't affect siblings
	root.render(html`<h2>Updated content</h2>`)
	assert_eq(el.innerHTML, '<div>before</div><!--?[--><h2>Updated content</h2><!--?]--><div>after</div>')
})

test('complex real-world template hydrates correctly', () => {
	const todos = [
		{ id: 1, text: 'Learn dhtml', completed: false },
		{ id: 2, text: 'Build an app', completed: true },
	]

	const { el } = setup(html`
		<div class="todo-app">
			<header>
				<h1>Todos</h1>
				<input type="text" placeholder="Add todo..." />
			</header>
			<ul class="todo-list">
				${todos.map(
					todo => html`
						<li class=${todo.completed ? 'completed' : ''}>
							<input type="checkbox" checked=${todo.completed} />
							<span>${todo.text}</span>
							<button class="delete">×</button>
						</li>
					`,
				)}
			</ul>
			<footer>${todos.filter(t => !t.completed).length} items left</footer>
		</div>
	`)

	assert(el.querySelector('.todo-app'))
	assert_eq(el.querySelectorAll('li').length, 2)
	assert(el.querySelector('li.completed'))
	assert_eq(el.querySelector('footer')!.textContent, '1 items left')

	// Test that checkboxes are properly set
	const checkboxes = el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
	assert_eq(checkboxes.length, 2)
	assert(!checkboxes[0].checked)
	assert(checkboxes[1].checked)
})

test('no end', () => {
	const el = document.createElement('div')
	el.innerHTML = `<?[>hello`

	let thrown = false

	try {
		hydrate(el, 'hello')
	} catch (error) {
		thrown = true
		assert(error instanceof Error)
		if (__DEV__) assert(error.message.includes('Could not find hydration end comment.'))
	}

	assert(thrown)
})

test('renderable passthrough errors', () => {
	let thrown = false

	const oops = new Error('oops')
	let count = 0

	try {
		setup({
			render() {
				if (++count === 2) throw oops
				return 'hello'
			},
		})
	} catch (error) {
		thrown = true
		assert(error === oops)
	}

	assert(thrown)
})

test('hydration of deep nesting', () => {
	const DEPTH = 10

	const leaf = {
		text: 'hello!',
		render() {
			return this.text
		},
	}
	let app: Renderable = leaf
	for (let i = 0; i < DEPTH; i++) {
		const inner = app
		app = { render: () => inner }
	}

	const { el } = setup(app)

	assert_eq(el.innerHTML, '<!--?[-->'.repeat(DEPTH + 1) + 'hello!' + '<!--?]-->'.repeat(DEPTH + 1))

	leaf.text = 'goodbye'
	invalidate(leaf)

	assert_eq(el.innerHTML, '<!--?[-->'.repeat(DEPTH + 1) + 'goodbye' + '<!--?]-->'.repeat(DEPTH + 1))
})

test('hydration mismatch: tag name', () => {
	const el = document.createElement('div')
	el.innerHTML = renderToString(html`<h1>Hello!</h1>`)
	let thrown = false

	try {
		hydrate(el, html`<h2>Hello!</h2>`)
	} catch (error) {
		thrown = true
		assert(error instanceof Error)
		assert(error.message.includes('Tag name mismatch'))
	}

	assert(thrown)
})
