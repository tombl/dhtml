import { mock, test } from 'bun:test'
import { html } from 'dhtml'
import { invalidate, onMount, onUnmount } from 'dhtml/client'
import assert from 'node:assert/strict'
import { setup } from './setup.ts'

const dev_test = test.skipIf(!__DEV__)

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

	// rerendering a valid renderable should noop:
	root.render(app)
	assert.equal(el.innerHTML, 'Count: 0')

	// but invalidating it shouldn't:
	invalidate(app)
	assert.equal(el.innerHTML, 'Count: 1')
	invalidate(app)
	assert.equal(el.innerHTML, 'Count: 2')
	assert.equal(app.i, 3)
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
	assert.deepStrictEqual(sequence, ['outer mount', 'outer render', 'inner mount', 'inner render'])
	sequence.length = 0

	outer.show = false
	invalidate(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner cleanup'])
	sequence.length = 0

	outer.show = true
	invalidate(outer)
	assert.equal(el.innerHTML, 'inner')
	// inner is mounted a second time because of the above cleanup
	assert.deepStrictEqual(sequence, ['outer render', 'inner mount', 'inner render'])
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
	assert.deepStrictEqual(sequence, ['mount', 'render'])
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
	invalidate(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	invalidate(outer)
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	invalidate(outer)
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
	invalidate(outer)
	assert.equal(el.innerHTML, '')
	assert.deepStrictEqual(sequence, ['outer render', 'inner abort'])
	sequence.length = 0

	outer.show = true
	invalidate(outer)
	assert.equal(el.innerHTML, 'inner')
	assert.deepStrictEqual(sequence, ['outer render', 'inner render'])
	sequence.length = 0

	outer.show = false
	invalidate(outer)
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
	let mounted = 0

	const app = {
		render() {
			return html`${mounted}`
		},
	}
	onMount(app, () => {
		mounted++
		return () => {
			mounted--
		}
	})

	assert.equal(mounted, 0)

	for (let i = 0; i < 10; i++) {
		root.render(app)
		assert.equal(mounted, 1)

		root.render(null)
		assert.equal(mounted, 0)
	}
})

test('renderables can be rendered in multiple places at once', () => {
	const { root: root1, el: el1 } = setup()
	const { root: root2, el: el2 } = setup()

	let mounted = 0

	const app = {
		value: 'shared',
		render() {
			return this.value
		},
	}

	onMount(app, () => {
		mounted++
		return () => mounted--
	})

	// Render in first location
	root1.render(app)
	assert.equal(el1.innerHTML, 'shared')
	assert.equal(mounted, 1)

	// Render in second location - should NOT mount again (mount only called on first mount)
	root2.render(app)
	assert.equal(el2.innerHTML, 'shared')
	assert.equal(mounted, 1) // Still 1, not 2

	// Update the renderable - both should update
	app.value = 'updated'
	invalidate(app)
	assert.equal(el1.innerHTML, 'updated')
	assert.equal(el2.innerHTML, 'updated')

	// Remove from first location - should NOT unmount yet
	root1.render(null)
	assert.equal(mounted, 1) // Still mounted in second location
	assert.equal(el2.innerHTML, 'updated') // Second location still works

	// Remove from second location - NOW it should unmount
	root2.render(null)
	assert.equal(mounted, 0) // Now unmounted
})

test('renderables can be rendered in multiple places at once with a single root', () => {
	const { root, el } = setup()

	let mounted = 0

	const thing = {
		value: 'shared',
		render() {
			return this.value
		},
	}

	onMount(thing, () => {
		mounted++
		return () => mounted--
	})

	root.render(html`<span>${thing}</span><span>${thing}</span>`)

	assert.equal(mounted, 1)
	assert.equal(el.innerHTML, '<span>shared</span><span>shared</span>')

	thing.value = 'updated'
	invalidate(thing)
	assert.equal(mounted, 1)
	assert.equal(el.innerHTML, '<span>updated</span><span>updated</span>')

	root.render(null)
	assert.equal(mounted, 0)
})

test('invalidating an unmounted renderable does nothing', () => {
	const { root, el } = setup()

	const app1 = {
		render() {
			return 'app1'
		},
	}

	const app2 = {
		render() {
			return 'app2'
		},
	}

	root.render(app1)
	assert.equal(el.textContent, 'app1')

	root.render(app2)
	assert.equal(el.textContent, 'app2')

	invalidate(app1)
	assert.equal(el.textContent, 'app2')
})

dev_test('invalidate throws error when renderable has not been rendered', () => {
	const app = {
		render() {
			return 'never rendered'
		},
	}

	assert.throws(() => invalidate(app), /the renderable has not been rendered/)
})

test('onMount called on already mounted renderable executes immediately', () => {
	const { root } = setup()

	let mounted = 0
	let unmounted = 0

	const app = {
		render() {
			return 'app'
		},
	}

	root.render(app)

	onMount(app, () => {
		mounted++
		return () => {
			unmounted++
		}
	})

	assert.equal(mounted, 1)
	assert.equal(unmounted, 0)

	root.render(null)
	assert.equal(unmounted, 1)
})

test('invalidating a parent does not re-render a child', () => {
	const { root, el } = setup()

	let renders = 0
	const child = {
		render() {
			renders++
			return 'child'
		},
	}

	const parent = {
		render() {
			return child
		},
	}

	root.render(parent)
	assert.equal(el.innerHTML, 'child')
	assert.equal(renders, 1)

	invalidate(parent)
	assert.equal(el.innerHTML, 'child')
	assert.equal(renders, 1)
})
