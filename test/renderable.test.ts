import { getParentNode, html, invalidate, onMount, onUnmount, type Renderable } from 'dhtml'
import { describe, expect, it, vi } from 'vitest'
import { setup } from './setup'

describe('renderables', () => {
	it('works', async () => {
		const { root, el } = setup()

		root.render(
			html`${{
				render() {
					return html`<h1>Hello, world!</h1>`
				},
			}}`,
		)
		expect(el.innerHTML).toBe('<h1>Hello, world!</h1>')

		const app = {
			i: 0,
			render() {
				return html`Count: ${this.i++}`
			},
		}
		root.render(app)
		expect(el.innerHTML).toBe('Count: 0')
		root.render(app)
		expect(el.innerHTML).toBe('Count: 1')
		await invalidate(app)
		expect(el.innerHTML).toBe('Count: 2')
		await invalidate(app)
		expect(el.innerHTML).toBe('Count: 3')
		expect(app.i).toBe(4)
	})

	it('handles undefined', () => {
		const { root, el } = setup()

		root.render({
			// @ts-expect-error
			render() {},
		})

		expect(el.innerHTML).toBe('')
	})
})

describe('onMount', () => {
	it('calls in the right order', () => {
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
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner render",
			  "inner mount",
			  "outer mount",
			]
		`)
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner cleanup",
			]
		`)
		sequence.length = 0

		outer.show = true
		root.render(outer)
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner render",
			]
		`)
		sequence.length = 0
	})

	it('registers multiple callbacks', () => {
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
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "mount 1",
			  "mount 2",
			]
		`)
		sequence.length = 0

		root.render(null)
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "cleanup 1",
			  "cleanup 2",
			]
		`)
	})

	it('registers a fixed callback once', () => {
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
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "mount",
			]
		`)
		sequence.length = 0

		root.render(null)
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "cleanup",
			]
		`)
	})

	it('registers callbacks outside of render', () => {
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

		expect(sequence).toMatchInlineSnapshot(`[]`)

		root.render(app)
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "render",
			  "mount",
			]
		`)
		sequence.length = 0

		root.render(null)
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "cleanup",
			]
		`)
	})

	it('can access the dom in callback', () => {
		const { root } = setup()

		const app = {
			render() {
				onMount(this, () => {
					const parent = getParentNode(this) as Element
					expect(parent.firstElementChild).toBeInstanceOf(HTMLParagraphElement)
				})
				return html`<p>Hello, world!</p>`
			},
		}

		root.render(app)
	})

	it('works after render', () => {
		const { root } = setup()

		const app = {
			render() {
				return 'app'
			},
		}

		root.render(app)

		const mounted = vi.fn()
		onMount(app, mounted)
		expect(mounted).toHaveBeenCalledOnce()
	})
})

describe('onUnmount', () => {
	it('unmount deep', () => {
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
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner render",
			]
		`)
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner abort",
			]
		`)
		sequence.length = 0

		outer.show = true
		root.render(outer)
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner render",
			]
		`)
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner abort",
			]
		`)
		sequence.length = 0
	})

	it('unmount shallow', () => {
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
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner render",
			]
		`)
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner abort",
			]
		`)
		sequence.length = 0

		outer.show = true
		root.render(outer)
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner render",
			]
		`)
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toMatchInlineSnapshot(`
			[
			  "outer render",
			  "inner abort",
			]
		`)
		sequence.length = 0
	})

	it('works externally', async () => {
		const { root, el } = setup()

		const app = {
			render() {
				return [1, 2, 3].map(i => html`<div>${i}</div>`)
			},
		}

		const unmounted = vi.fn()
		onUnmount(app, unmounted)

		root.render(app)
		expect(el.innerHTML).toMatchInlineSnapshot(`"<div>1</div><div>2</div><div>3</div>"`)
		expect(unmounted).not.toHaveBeenCalled()

		root.render(null)
		expect(unmounted).toHaveBeenCalledOnce()
	})
})

describe('getParentNode', () => {
	it('works externally', () => {
		const { root, el } = setup()

		const app = {
			render() {
				return html`<div></div>`
			},
		}

		root.render(app)
		expect(el.innerHTML).toBe('<div></div>')
		expect(getParentNode(app)).toBe(el)
	})

	it('works internally', () => {
		const { root, el } = setup()

		root.render({
			render() {
				return html`<div>${getParentNode(this) === el}</div>`
			},
		} satisfies Renderable)

		expect(el.innerHTML).toBe('<div>true</div>')
	})

	it('handles nesting', () => {
		const { root, el } = setup()

		const inner = {
			render() {
				const parent = getParentNode(this)

				expect(parent).toBeInstanceOf(HTMLDivElement)
				expect((parent as HTMLDivElement).className).toBe('the-app')
				expect(parent.parentNode).toBe(el)

				return null
			},
		}

		const spy = vi.spyOn(inner, 'render')

		root.render({
			render() {
				return html`<div class="the-app">${inner}</div>`
			},
		})

		expect(spy).toHaveBeenCalledOnce()
	})
})
