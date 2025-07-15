import { html } from 'dhtml'
import { invalidate } from 'dhtml/client'
import { assert, assert_deep_eq, assert_eq, test } from '../../../scripts/test/test.ts'
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
	assert_eq(el.innerHTML, '<h1>Hello, world!</h1>')

	const app = {
		i: 0,
		render() {
			return html`Count: ${this.i++}`
		},
	}
	root.render(app)
	assert_eq(el.innerHTML, 'Count: 0')

	// rerendering a valid renderable should noop:
	root.render(app)
	assert_eq(el.innerHTML, 'Count: 0')

	// but invalidating it shouldn't:
	invalidate(app)
	assert_eq(el.innerHTML, 'Count: 1')
	invalidate(app)
	assert_eq(el.innerHTML, 'Count: 2')
	assert_eq(app.i, 3)
})

test('renderables handle undefined correctly', () => {
	const { root, el } = setup()

	root.render({
		// @ts-expect-error
		render() {},
	})

	assert_eq(el.innerHTML, '')
})

test('renderables can throw instead of returning', () => {
	const { root, el } = setup()

	root.render({
		render() {
			throw html`this was thrown`
		},
	})

	assert_eq(el.innerHTML, 'this was thrown')
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
	assert_eq(el1.innerHTML, 'shared')

	// Render in second location - should NOT mount again (mount only called on first mount)
	root2.render(app)
	assert_eq(el2.innerHTML, 'shared')

	// Update the renderable - both should update
	app.value = 'updated'
	invalidate(app)
	assert_eq(el1.innerHTML, 'updated')
	assert_eq(el2.innerHTML, 'updated')

	// Remove from first location - should NOT unmount yet
	root1.render(null)
	assert_eq(el2.innerHTML, 'updated') // Second location still works

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

	assert_eq(el.innerHTML, '<span>shared</span><span>shared</span>')

	thing.value = 'updated'
	invalidate(thing)
	assert_eq(el.innerHTML, '<span>updated</span><span>updated</span>')

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
	assert_eq(el.textContent, 'app1')

	root.render(app2)
	assert_eq(el.textContent, 'app2')

	invalidate(app1)
	assert_eq(el.textContent, 'app2')
})

if (__DEV__) {
	test('invalidate throws error when renderable has not been rendered', () => {
		const app = {
			render() {
				return 'never rendered'
			},
		}

		try {
			invalidate(app)
			assert(false, 'Expected error to be thrown')
		} catch (error) {
			assert(error instanceof Error)
			assert(/the renderable has not been rendered/.test(error.message))
		}
	})
}


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
	assert_eq(el.innerHTML, 'child')
	assert_eq(renders, 1)

	invalidate(parent)
	assert_eq(el.innerHTML, 'child')
	assert_eq(renders, 1)
})
