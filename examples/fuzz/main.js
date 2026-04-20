import { html } from 'dhtml'
import { createRoot } from 'dhtml/client'
import { renderToString } from 'dhtml/server'

function canonicalize(str) {
	const t = document.createElement('template')
	t.innerHTML = str
	return t.innerHTML
}

/**
 * @param {...string} strings
 * @returns {TemplateStringsArray}
 */
function tsa(...strings) {
	return Object.assign(strings, { raw: strings })
}

function tag(name) {
	const child = random()

	return {
		render() {
			return html(tsa(`<${name}>`, `</${name}>`), child)
		},
		toString() {
			return `<${name}>${child}</${name}>`
		},
	}
}
function voidTag(name) {
	return {
		render() {
			return html(tsa(`<${name}>`))
		},
		toString() {
			return `<${name}>`
		},
	}
}
function text(raw) {
	return {
		render() {
			return raw
		},
		toString() {
			return raw
				.replaceAll('&', '&amp;')
				.replaceAll('<', '&lt;')
				.replaceAll('>', '&gt;')
				.replaceAll('"', '&quot;')
				.replaceAll("'", '&#39;')
		},
	}
}
function sequence(length) {
	const items = Array.from({ length }, () => random())
	return {
		render() {
			return items
		},
		toString() {
			return items.join('')
		},
	}
}

const choices = [
	() => tag('a'),
	() => tag('p'),
	() => tag('span'),
	() => tag('div'),
	() => tag('table'),
	() => tag('tbody'),
	() => tag('tr'),
	() => tag('td'),
	() => tag('form'),
	() => tag('button'),
	() => tag('input'),
	() => voidTag('br'),
	() => tag('h1'),
	() => tag('h2'),
	() => tag('h3'),
	() => tag('ul'),
	() => tag('ol'),
	() => tag('li'),
	() => tag('section'),
	() => tag('article'),
	() => tag('header'),
	() => tag('footer'),
	() => tag('nav'),
	() => tag('main'),
	() => tag('aside'),
	() => tag('strong'),
	() => tag('em'),
	() => tag('code'),
	() => tag('pre'),
	() => tag('blockquote'),
	() => tag('label'),
	() => tag('select'),
	() => tag('option'),
	// () => tag('textarea'), // causes issues
	() => tag('fieldset'),
	() => tag('legend'),
	() => tag('figure'),
	() => tag('figcaption'),
	() => tag('caption'),
	() => tag('thead'),
	() => tag('tfoot'),
	() => tag('th'),
	() => tag('small'),
	() => tag('b'),
	() => tag('i'),
	() => tag('u'),
	() => tag('sub'),
	() => tag('sup'),
	() => tag('mark'),
	() => tag('del'),
	() => tag('ins'),
	() => tag('abbr'),
	() => tag('cite'),
	() => tag('q'),
	() => tag('dfn'),
	() => tag('time'),
	() => tag('address'),
	() => tag('details'),
	() => tag('summary'),
	() => tag('dialog'),
	() => tag('data'),
	() => tag('output'),
	() => tag('progress'),
	() => tag('meter'),
	() => voidTag('hr'),
	() => voidTag('img'),
	() => voidTag('area'),
	() => voidTag('base'),
	() => voidTag('col'),
	() => voidTag('embed'),
	() => voidTag('link'),
	() => voidTag('meta'),
	() => voidTag('param'),
	() => voidTag('source'),
	() => voidTag('track'),
	() => voidTag('wbr'),
	() => text('text'),
	() => text(''),
	() => text('<hello>'),
	() => sequence(2),
	() => sequence(3),
	() => sequence(4),
	() => sequence(5),
	() => ({
		render: () => null,
		toString: () => '',
	}),
]
function random() {
	return choices[Math.floor(Math.random() * choices.length)]()
}

for (let i = 0; i < 10000; i++) {
	const app = random()

	const el = document.createElement('div')
	const root = createRoot(el)
	const str = app.toString()

	try {
		root.render(app)
	} catch (error) {
		console.warn(str, app)
		throw error
	}

	const str2 = renderToString(app)

	if (str !== str2) {
		console.log('ssr mismatch, expected:', str, 'got:', str2)
	}

	if (canonicalize(str) !== str) continue

	if (el.innerHTML !== str) {
		console.log('rendering mismatch, expected:', str, 'got:', el.innerHTML)
	}
}
console.log('done')
