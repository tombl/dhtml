const TAG_TEMPLATE = Symbol('template')
const TAG_DYNAMICS = Symbol('dynamics')

const DYNAMIC_WHOLE = /^dyn-\$(\d+)$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)/gi
const templateCache = new Map()
function compileTemplate(statics) {
	if (templateCache.has(statics)) return templateCache.get(statics)
	const templateElement = document.createElement('template')
	templateElement.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}`), '')

	// replace all dyn-$N text nodes with equivalent comments
	let walker = document.createTreeWalker(templateElement.content, NodeFilter.SHOW_TEXT)
	let node
	while ((node = walker.nextNode())) {
		for (const m of [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse()) {
			node.splitText(m.index + m[0].length) // the regular text
			const dyn = node.splitText(m.index) // the dyn-$N part
			dyn.replaceWith(document.createComment(dyn.data))
		}
	}

	let nextPatch = 0
	const patches = Array(statics.length - 1)
	function patch(node, idx, fn) {
		node.dataset.dynPatch ??= ''
		node.dataset.dynPatch += ' ' + nextPatch
		if (nextPatch !== idx) console.warn('dynamic value detected in static location')
		patches[nextPatch++] = (node, dynamics) => fn(node, dynamics[idx])
	}

	walker = document.createTreeWalker(templateElement.content, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT)
	while ((node = walker.nextNode()) && nextPatch < patches.length) {
		if (node.nodeType === Node.COMMENT_NODE) {
			const match = DYNAMIC_WHOLE.exec(node.data)
			if (match === null) continue
			const idx = parseInt(match[1])
			const child = [...node.parentElement.childNodes].indexOf(node)
			patch(node.parentElement, idx, (node, value) => {
				node = node.childNodes[child]
				if (typeof value !== 'object') value = document.createTextNode(value)
				node.replaceWith(value)
				return value
			})
		} else {
			const toRemove = []
			for (let { name, value } of node.attributes) {
				switch (name[0]) {
					// event:
					case '@': {
						toRemove.push(name)
						name = name.slice(1)
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) throw new Error('`@` attributes must be functions')
						const idx = parseInt(match[1])
						patch(node, idx, (node, value) => {
							if (typeof value === 'function') {
								node.addEventListener(name, value)
							} else if (value === null) {
								node.removeEventListener(name, value)
							} else {
								throw new Error(`Expected a function or null, got ${value}`)
							}
						})
						break
					}

					// property:
					case '.': {
						toRemove.push(name)
						name = name.slice(1)
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) throw new Error('`.` attributes must be properties')
						const idx = parseInt(match[1])
						patch(node, idx, (node, value) => {
							node[name] = value
						})
						break
					}

					// boolean attribute:
					case '?': {
						toRemove.push(name)
						name = name.slice(1)
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) throw new Error('`?` attributes must be booleans')
						const idx = parseInt(match[1])
						patch(node, idx, (node, value) => {
							node.toggleAttribute(name, value)
						})
						break
					}

					// attribute:
					default: {
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) continue
						const idx = parseInt(match[1])
						patch(node, idx, (node, value) => {
							node.setAttribute(name, value)
						})
					}
				}
			}
			for (const name of toRemove) node.removeAttribute(name)
		}
	}

	patches.length = nextPatch

	const obj = { content: templateElement.content, patches }
	templateCache.set(statics, obj)
	return obj
}

export function html(statics, ...dynamics) {
	return { [TAG_TEMPLATE]: compileTemplate(statics), [TAG_DYNAMICS]: dynamics }
}

class TemplateInstance {
	constructor(template, dynamics, range) {
		this.patches = template.patches
		const doc = template.content.cloneNode(true)
		this.elements = []

		for (const el of doc.querySelectorAll('[data-dyn-patch]')) {
			const patches = el.dataset.dynPatch
			delete el.dataset.dynPatch
			for (const patch of patches.slice(1).split('  ')) this.elements[patch] = el
		}

		this.update(dynamics)
		range.deleteContents()
		range.insertNode(doc)
	}
	update(dynamics) {
		for (let i = 0; i < this.patches.length; i++) {
			const replacement = this.patches[i](this.elements[i], dynamics)
			if (replacement !== undefined) this.elements[i] = replacement
		}
	}
}

export class Root {
	#instance
	#range = document.createRange()

	constructor(parent) {
		const comment = document.createComment('')
		parent.appendChild(comment)
		this.#range.selectNode(comment)
	}

	render({ [TAG_TEMPLATE]: template, [TAG_DYNAMICS]: dynamics }) {
		if (this.#instance?.template === template) {
			this.#instance.update(dynamics)
		} else {
			this.#instance = new TemplateInstance(template, dynamics, this.#range)
		}
	}
}
