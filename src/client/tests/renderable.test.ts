import { html, type Renderable } from 'dhtml'
import { getParentNode, invalidate, onMount, onUnmount } from 'dhtml/client'
import test, { type TestContext } from 'node:test'
import { setup } from './setup.ts'

test('renderables work correctly', async (t: TestContext) => {
	const { root, el } = setup()

	root.render(
		html`${{
			render() {
				return html`<h1>Hello, world!</h1>`
			},
		}}`,
	)
	t.assert.strictEqual(el.innerHTML, '<h1>Hello, world!</h1>')

	const app = {
		i: 0,
		render() {
			return html`Count: ${this.i++}`
		},
	}
	root.render(app)
	t.assert.strictEqual(el.innerHTML, 'Count: 0')
	root.render(app)
	t.assert.strictEqual(el.innerHTML, 'Count: 1')
	await invalidate(app)
	t.assert.strictEqual(el.innerHTML, 'Count: 2')
	await invalidate(app)
	t.assert.strictEqual(el.innerHTML, 'Count: 3')
	t.assert.strictEqual(app.i, 4)
})

test('renderables handle undefined correctly', (t: TestContext) => {
	const { root, el } = setup()

	root.render({
		// @ts-expect-error
		render() {},
	})

	t.assert.strictEqual(el.innerHTML, '')
})

test('onMount calls in the right order', (t: TestContext) => {
	const { root, el } = setup()

	const sequence: string[] = []

	const inner = {
		attached: false,
		render() {
			sequence.push('inner render')
			if (!this.attached) {
				this.attached = true
				onMount(this, () => {
					sequence.push('inner mount')
					return () => {
						sequence.push('inner cleanup')
					}
				})
			}
			return 'inner'
		},
	}

	const outer = {
		attached: false,
		show: true,
		render() {
			sequence.push('outer render')
			if (!this.attached) {
				this.attached = true
				onMount(this, () => {
					sequence.push('outer mount')
					return () => {
						sequence.push('outer cleanup')
					}
				})
			}
			if (!this.show) return null
			return inner
		},
	}

	outer.show = true
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, 'inner')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner render', 'inner mount', 'outer mount'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, '')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner cleanup'])
	sequence.length = 0

	outer.show = true
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, 'inner')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0
})

test('onMount registers multiple callbacks', (t: TestContext) => {
	const { root } = setup()

	const sequence: string[] = []

	const app = {
		render() {
			onMount(this, () => {
				sequence.push('mount 1')
				return () => sequence.push('cleanup 1')
			})

			onMount(this, () => {
				sequence.push('mount 2')
				return () => sequence.push('cleanup 2')
			})

			return 'app'
		},
	}

	root.render(app)
	t.assert.deepStrictEqual(sequence, ['mount 1', 'mount 2'])
	sequence.length = 0

	root.render(null)
	t.assert.deepStrictEqual(sequence, ['cleanup 1', 'cleanup 2'])
})

test('onMount registers a fixed callback once', (t: TestContext) => {
	const { root } = setup()

	const sequence: string[] = []

	function callback() {
		sequence.push('mount')
		return () => sequence.push('cleanup')
	}

	const app = {
		render() {
			onMount(this, callback)
			onMount(this, callback)
			return 'app'
		},
	}

	root.render(app)
	t.assert.deepStrictEqual(sequence, ['mount'])
	sequence.length = 0

	root.render(null)
	t.assert.deepStrictEqual(sequence, ['cleanup'])
})

test('onMount registers callbacks outside of render', (t: TestContext) => {
	const { root } = setup()

	const sequence: string[] = []

	const app = {
		render() {
			sequence.push('render')
			return 'app'
		},
	}

	onMount(app, () => {
		sequence.push('mount')
		return () => sequence.push('cleanup')
	})

	t.assert.deepStrictEqual(sequence, [])

	root.render(app)
	t.assert.deepStrictEqual(sequence, ['render', 'mount'])
	sequence.length = 0

	root.render(null)
	t.assert.deepStrictEqual(sequence, ['cleanup'])
})

test('onMount can access the dom in callback', (t: TestContext) => {
	const { root } = setup()

	const app = {
		render() {
			onMount(this, () => {
				const parent = getParentNode(this) as Element
				t.assert.ok(parent.firstElementChild instanceof HTMLParagraphElement)
			})
			return html`<p>Hello, world!</p>`
		},
	}

	root.render(app)
})

test('onMount works after render', (t: TestContext) => {
	const { root } = setup()

	const app = {
		render() {
			return 'app'
		},
	}

	root.render(app)

	const mounted = t.mock.fn()
	onMount(app, mounted)
	t.assert.strictEqual(mounted.mock.callCount(), 1)
})

test('onUnmount deep works correctly', (t: TestContext) => {
	const { root, el } = setup()

	const sequence: string[] = []

	const inner = {
		attached: false,
		render() {
			sequence.push('inner render')
			if (!this.attached) {
				this.attached = true
				onUnmount(this, () => {
					this.attached = false
					sequence.push('inner abort')
				})
			}
			return 'inner'
		},
	}

	const outer = {
		attached: false,
		show: true,
		render() {
			sequence.push('outer render')
			if (!this.attached) {
				this.attached = true
				onUnmount(this, () => {
					this.attached = false
					sequence.push('outer abort')
				})
			}
			if (!this.show) return null
			return inner
		},
	}

	outer.show = true
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, 'inner')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, '')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, 'inner')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, '')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0
})

test('onUnmount shallow works correctly', (t: TestContext) => {
	const { root, el } = setup()

	const sequence: string[] = []

	const inner = {
		attached: false,
		render() {
			sequence.push('inner render')
			if (!this.attached) {
				this.attached = true
				onUnmount(this, () => {
					this.attached = false
					sequence.push('inner abort')
				})
			}
			return 'inner'
		},
	}

	const outer = {
		attached: false,
		show: true,
		render() {
			sequence.push('outer render')
			if (!this.attached) {
				this.attached = true
				onUnmount(this, () => {
					this.attached = false
					sequence.push('outer abort')
				})
			}
			return html`${this.show ? inner : null}`
		},
	}

	outer.show = true
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, 'inner')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, '')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, 'inner')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	t.assert.strictEqual(el.innerHTML, '')
	t.assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0
})

test('onUnmount works externally', async (t: TestContext) => {
	const { root, el } = setup()

	const app = {
		render() {
			return [1, 2, 3].map(i => html`<div>${i}</div>`)
		},
	}

	const unmounted = t.mock.fn()
	onUnmount(app, unmounted)

	root.render(app)
	t.assert.strictEqual(el.innerHTML, '<div>1</div><div>2</div><div>3</div>')
	t.assert.strictEqual(unmounted.mock.callCount(), 0)

	root.render(null)
	t.assert.strictEqual(unmounted.mock.callCount(), 1)
})

test('getParentNode works externally', (t: TestContext) => {
	const { root, el } = setup()

	const app = {
		render() {
			return html`<div></div>`
		},
	}

	root.render(app)
	t.assert.strictEqual(el.innerHTML, '<div></div>')
	t.assert.strictEqual(getParentNode(app), el)
})

test('getParentNode works internally', (t: TestContext) => {
	const { root, el } = setup()

	root.render({
		render() {
			return html`<div>${getParentNode(this) === el}</div>`
		},
	} satisfies Renderable)

	t.assert.strictEqual(el.innerHTML, '<div>true</div>')
})

test('getParentNode handles nesting', (t: TestContext) => {
	const { root, el } = setup()

	const inner = {
		render() {
			const parent = getParentNode(this)

			t.assert.ok(parent instanceof HTMLDivElement)
			t.assert.strictEqual((parent as HTMLDivElement).outerHTML, '<div class="the-app"><!----></div>')
			t.assert.strictEqual(parent.parentNode, el)

			return null
		},
	}

	const spy = t.mock.fn(inner.render)
	inner.render = spy

	root.render({
		render() {
			return html`<div class="the-app">${inner}</div>`
		},
	})

	t.assert.strictEqual(spy.mock.callCount(), 1)
})
