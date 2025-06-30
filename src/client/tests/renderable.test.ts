import { mock, test } from 'bun:test'
import { html } from 'dhtml'
import { invalidate, onMount, onUnmount } from 'dhtml/client'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

test('renderables work correctly', () => {
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
	invalidate(app)
	assert.equal(el.innerHTML, 'Count: 2')
	invalidate(app)
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

test('renderables can throw instead of returning', () => {
	const { root, el } = setup()

	root.render({
		render() {
			throw html`this was thrown`
		},
	})

	assert.equal(el.innerHTML, 'this was thrown')
})

test('onMount calls in the right order', () => {
	const { root, el } = setup()

	const sequence: string[] = []

	const inner = {
		render() {
			sequence.push('inner render')
			return 'inner'
		},
	}
	onMount(inner, () => {
		sequence.push('inner mount')
		return () => {
			sequence.push('inner cleanup')
		}
	})

	const outer = {
		show: true,
		render() {
			sequence.push('outer render')
			if (!this.show) return null
			return inner
		},
	}

	onMount(outer, () => {
		sequence.push('outer mount')
		return () => {
			sequence.push('outer cleanup')
		}
	})

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
	// inner is mounted a second time because of the above cleanup
	assert.deepStrictEqual(sequence, ['outer render', 'inner render', 'inner mount'])
	sequence.length = 0
})

test('onMount registers multiple callbacks', () => {
	const { root } = setup()

	const sequence: string[] = []

	const app = {
		render() {
			return 'app'
		},
	}

	onMount(app, () => {
		sequence.push('mount 1')
		return () => sequence.push('cleanup 1')
	})

	onMount(app, () => {
		sequence.push('mount 2')
		return () => sequence.push('cleanup 2')
	})

	root.render(app)
	assert.deepStrictEqual(sequence, ['mount 1', 'mount 2'])
	sequence.length = 0

	root.render(null)
	assert.deepStrictEqual(sequence, ['cleanup 1', 'cleanup 2'])
})

test('onMount registers a fixed callback multiple times', () => {
	const { root } = setup()

	const sequence: string[] = []

	function callback() {
		sequence.push('mount')
		return () => sequence.push('cleanup')
	}

	const app = {
		render() {
			return 'app'
		},
	}

	onMount(app, callback)
	onMount(app, callback)

	root.render(app)
	assert.deepStrictEqual(sequence, ['mount', 'mount'])
	sequence.length = 0

	root.render(null)
	assert.deepStrictEqual(sequence, ['cleanup', 'cleanup'])
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

test('onMount is called immediately on a mounted renderable', () => {
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
		render() {
			sequence.push('inner render')
			return 'inner'
		},
	}

	onUnmount(inner, () => {
		sequence.push('inner abort')
	})

	const outer = {
		show: true,
		render() {
			sequence.push('outer render')
			if (!this.show) return null
			return inner
		},
	}

	onUnmount(outer, () => {
		sequence.push('outer abort')
	})

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
		render() {
			sequence.push('inner render')
			return 'inner'
		},
	}

	onUnmount(inner, () => {
		sequence.push('inner abort')
	})

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

test('onMount works for repeated mounts', () => {
	const { root } = setup()
	let mounted: boolean | null = null

	const app = {
		render() {
			return html`${mounted}`
		},
	}
	onMount(app, () => {
		mounted = true
		return () => {
			mounted = false
		}
	})

	assert.equal(mounted, null)

	for (let i = 0; i < 10; i++) {
		root.render(app)
		assert.equal(mounted, true)

		root.render(null)
		assert.equal(mounted, false)
	}
})
