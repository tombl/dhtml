import { test } from 'bun:test'
import { html } from 'dhtml'
import { invalidate } from 'dhtml/client'
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

test('renderables can be rendered in multiple places at once', () => {
	const { root: root1, el: el1 } = setup()
	const { root: root2, el: el2 } = setup()

	const app = {
		value: 'shared',
		render() {
			return this.value
		},
	}

	// Render in first location
	root1.render(app)
	assert.equal(el1.innerHTML, 'shared')

	// Render in second location - should NOT mount again (mount only called on first mount)
	root2.render(app)
	assert.equal(el2.innerHTML, 'shared')

	// Update the renderable - both should update
	app.value = 'updated'
	invalidate(app)
	assert.equal(el1.innerHTML, 'updated')
	assert.equal(el2.innerHTML, 'updated')

	// Remove from first location - should NOT unmount yet
	root1.render(null)
	assert.equal(el2.innerHTML, 'updated') // Second location still works

	// Remove from second location - NOW it should unmount
	root2.render(null)
})

test('renderables can be rendered in multiple places at once with a single root', () => {
	const { root, el } = setup()

	const thing = {
		value: 'shared',
		render() {
			return this.value
		},
	}

	root.render(html`<span>${thing}</span><span>${thing}</span>`)

	assert.equal(el.innerHTML, '<span>shared</span><span>shared</span>')

	thing.value = 'updated'
	invalidate(thing)
	assert.equal(el.innerHTML, '<span>updated</span><span>updated</span>')

	root.render(null)
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
