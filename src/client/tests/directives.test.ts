import { html } from 'dhtml'
import { attr, type Directive } from 'dhtml/client'
import { assert, assert_eq, test } from '../../../scripts/test/test.ts'
import { setup } from './setup.ts'

test('directive functions work correctly', () => {
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
	const div = el.querySelector('div')
	assert(div)
	assert_eq(div.style.cssText, 'color: red;')

	root.render(template(flipper))
	assert_eq(div.style.cssText, 'transform: scaleX(-1);')

	root.render(template(null))
	assert_eq(div.style.cssText, '')

	root.render(null)
})

test('directive functions with values work correctly', () => {
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
	const div = el.querySelector('div')
	assert(div)
	assert_eq(div.className, 'foo a b')

	root.render(template(['c', 'd']))
	assert_eq(div.className, 'foo c d')

	root.render(template([]))
	assert_eq(div.className, 'foo')
})

test('attr directive works correctly', () => {
	const { root, el } = setup()

	const template = (value: string | null) => html`
		<input id="attr-works-input"></input>
		<label ${attr('for', value)}>Hello, world!</label>
	`

	root.render(template('attr-works-input'))
	assert_eq(el.querySelector('label')!.htmlFor, 'attr-works-input')

	root.render(template('updated'))
	assert_eq(el.querySelector('label')!.htmlFor, 'updated')

	root.render(template(null))
	assert_eq(el.querySelector('label')!.htmlFor, '')
})

test('attr directive supports booleans', () => {
	const { root, el } = setup()

	const template = (value: boolean) => html`<input ${attr('disabled', value)} />`

	root.render(template(true))
	assert_eq(el.querySelector('input')!.disabled, true)

	root.render(template(false))
	assert_eq(el.querySelector('input')!.disabled, false)
})
