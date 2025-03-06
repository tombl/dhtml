import { attr, html, type Directive } from 'dhtml'
import { describe, expect, it } from 'vitest'
import { setup } from './setup'

describe('directives', () => {
	it('functions', () => {
		const { root, el } = setup()

		const redifier: Directive = node => {
			if (!(node instanceof HTMLElement)) throw new Error('expected HTMLElement')
			node.style.color = 'red'
			return () => {
				node.style.color = ''
			}
		}
		const flipper: Directive = node => {
			if (!(node instanceof HTMLElement)) throw new Error('expected HTMLElement')
			node.style.transform = 'scaleX(-1)'
			return () => {
				node.style.transform = ''
			}
		}

		const template = (d: Directive | null) => html`<div ${d}>Hello, world!</div>`

		root.render(template(redifier))
		const div = el.firstChild as HTMLElement
		expect(div.tagName).toBe('DIV')
		expect(div.style.cssText).toBe('color: red;')

		root.render(template(flipper))
		expect(div.style.cssText).toBe('transform: scaleX(-1);')

		root.render(template(null))
		expect(div.style.cssText).toBe('')

		root.render(null)
	})

	it('functions with values', () => {
		const { root, el } = setup()

		function classes(value: string[]): Directive {
			const values = value.filter(Boolean)
			return node => {
				node.classList.add(...values)
				return () => {
					node.classList.remove(...values)
				}
			}
		}

		const template = (c: string[]) => html`<div class="foo" ${classes(c)}>Hello, world!</div>`

		root.render(template(['a', 'b']))
		const div = el.firstChild as HTMLElement
		expect(div.tagName).toBe('DIV')
		expect(div.className).toBe('foo a b')

		root.render(template(['c', 'd']))
		expect(div.className).toBe('foo c d')

		root.render(template([]))
		expect(div.className).toBe('foo')
	})
})

describe('attr', () => {
	it('works', () => {
		const { root, el } = setup()

		const template = (value: string | null) => html`
			<input id="attr-works-input"></input>
			<label ${attr('for', value)}>Hello, world!</label>
		`

		root.render(template('attr-works-input'))
		expect(el.querySelector('label')).toHaveProperty('htmlFor', 'attr-works-input')

		root.render(template('updated'))
		expect(el.querySelector('label')).toHaveProperty('htmlFor', 'updated')

		root.render(template(null))
		expect(el.querySelector('label')).toHaveProperty('htmlFor', '')
	})

	it('supports booleans', () => {
		const { root, el } = setup()

		const template = (value: boolean) => html`<input ${attr('disabled', value)} />`

		root.render(template(true))
		expect(el.querySelector('input')).toHaveProperty('disabled', true)

		root.render(template(false))
		expect(el.querySelector('input')).toHaveProperty('disabled', false)
	})
})
