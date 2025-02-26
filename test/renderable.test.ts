import { getParentNode, html, invalidate, onUnmount, type Renderable } from 'dhtml'
import { describe, expect, it, vi } from 'vitest'
import { setup } from './setup'

describe('renderable', () => {
	it('basic', async () => {
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

	it('throws', () => {
		const { root, el } = setup()

		const oops = new Error('oops')
		let thrown
		try {
			root.render(
				html`${{
					render() {
						throw oops
					},
				}}`,
			)
		} catch (error) {
			thrown = error
		}
		expect(thrown).toBe(oops)

		// on an error, don't leave any visible artifacts
		expect(el.innerHTML).toBe('<!---->')
	})

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
		expect(sequence).toEqual(['outer render', 'inner render'])
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toEqual(['outer render', 'inner abort'])
		sequence.length = 0

		outer.show = true
		root.render(outer)
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toEqual(['outer render', 'inner render'])
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toEqual(['outer render', 'inner abort'])
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
		expect(sequence).toEqual(['outer render', 'inner render'])
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toEqual(['outer render', 'inner abort'])
		sequence.length = 0

		outer.show = true
		root.render(outer)
		expect(el.innerHTML).toBe('inner')
		expect(sequence).toEqual(['outer render', 'inner render'])
		sequence.length = 0

		outer.show = false
		root.render(outer)
		expect(el.innerHTML).toBe('')
		expect(sequence).toEqual(['outer render', 'inner abort'])
		sequence.length = 0
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
