import { mock, test } from 'bun:test'
import { html, type Renderable } from 'dhtml'
import { getParentNode, invalidate, onMount, onUnmount } from 'dhtml/client'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

test('renderables work correctly', async () => {
	const { root, el } = setup()

	root.render(
		html`${{
			render() {
				return html`<h1>Hello, world!</h1>`
			},
		}}`,
	)
	assert.equal(el.innerHTML, '<h1>Hello, world!</h1>')

	const app = {
		i: 0,
		render() {
			return html`Count: ${this.i++}`
		},
	}
	root.render(app)
	assert.equal(el.innerHTML, 'Count: 0')
	root.render(app)
	assert.equal(el.innerHTML, 'Count: 1')
	await invalidate(app)
	assert.equal(el.innerHTML, 'Count: 2')
	await invalidate(app)
	assert.equal(el.innerHTML, 'Count: 3')
	assert.equal(app.i, 4)
})

test('renderables handle undefined correctly', () => {
	const { root, el } = setup()

	root.render({
		// @ts-expect-error
		render() {},
	})

	assert.equal(el.innerHTML, '')
})

test('onMount calls in the right order', () => {
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
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render', 'inner mount', 'outer mount'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner cleanup'])
	sequence.length = 0

	outer.show = true
	root.render(outer)
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0
})

test('onMount registers multiple callbacks', () => {
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
	assert.deepStrictEqual(sequence, ['mount 1', 'mount 2'])
	sequence.length = 0

	root.render(null)
	assert.deepStrictEqual(sequence, ['cleanup 1', 'cleanup 2'])
})

test('onMount registers a fixed callback once', () => {
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
	assert.deepStrictEqual(sequence, ['mount'])
	sequence.length = 0

	root.render(null)
	assert.deepStrictEqual(sequence, ['cleanup'])
})

test('onMount registers callbacks outside of render', () => {
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

	assert.deepStrictEqual(sequence, [])

	root.render(app)
	assert.deepStrictEqual(sequence, ['render', 'mount'])
	sequence.length = 0

	root.render(null)
	assert.deepStrictEqual(sequence, ['cleanup'])
})

test('onMount can access the dom in callback', () => {
	const { root } = setup()

	const app = {
		render() {
			onMount(this, () => {
				const parent = getParentNode(this) as Element
				assert(parent.firstElementChild instanceof HTMLParagraphElement)
			})
			return html`<p>Hello, world!</p>`
		},
	}

	root.render(app)
})

test('onMount works after render', () => {
	const { root } = setup()

	const app = {
		render() {
			return 'app'
		},
	}

	root.render(app)

	const mounted = mock(() => {})
	onMount(app, mounted)
	assert.equal(mounted.mock.calls.length, 1)
})

test('onUnmount deep works correctly', () => {
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
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	root.render(outer)
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0
})

test('onUnmount shallow works correctly', () => {
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
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	root.render(outer)
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	root.render(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0
})

test('onUnmount works externally', async () => {
	const { root, el } = setup()

	const app = {
		render() {
			return [1, 2, 3].map(i => html`<div>${i}</div>`)
		},
	}

	const unmounted = mock(() => {})
	onUnmount(app, unmounted)

	root.render(app)
	assert.equal(el.innerHTML, '<div>1</div><div>2</div><div>3</div>')
	assert.equal(unmounted.mock.calls.length, 0)

	root.render(null)
	assert.equal(unmounted.mock.calls.length, 1)
})

test('getParentNode works externally', () => {
	const { root, el } = setup()

	const app = {
		render() {
			return html`<div></div>`
		},
	}

	root.render(app)
	assert.equal(el.innerHTML, '<div></div>')
	assert.equal(getParentNode(app), el)
})

test('getParentNode works internally', () => {
	const { root, el } = setup()

	root.render({
		render() {
			return html`<div>${getParentNode(this) === el}</div>`
		},
	} satisfies Renderable)

	assert.equal(el.innerHTML, '<div>true</div>')
})

test('getParentNode handles nesting', () => {
	const { root, el } = setup()

	const inner = {
		render() {
			const parent = getParentNode(this)

			assert(parent instanceof HTMLDivElement)
			assert.equal((parent as HTMLDivElement).outerHTML, '<div class="the-app"><!----></div>')
			assert.equal(parent.parentNode, el)

			return null
		},
	}

	const spy = mock(inner.render)
	inner.render = spy

	root.render({
		render() {
			return html`<div class="the-app">${inner}</div>`
		},
	})

	assert.equal(spy.mock.calls.length, 1)
})
