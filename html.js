const TAG_TEMPLATE = Symbol('template')
const TAG_DYNAMICS = Symbol('dynamics')

function memo(fn) {
	const cache = new Map()
	return arg => {
		if (cache.has(arg)) return cache.get(arg)
		const value = fn(arg)
		cache.set(arg, value)
		return value
	}
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)/gi
const compileTemplate = memo(statics => {
	const templateElement = document.createElement('template')
	templateElement.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}`), '')

	let nextPatch = 0
	const patches = Array(statics.length - 1)
	function patch(node, idx, fn) {
		node.dataset.dynPatch ??= ''
		node.dataset.dynPatch += ' ' + nextPatch
		if (nextPatch !== idx) console.warn('dynamic value detected in static location')
		patches[nextPatch++] = (node, dynamics) => fn(node, dynamics[idx])
	}

	for (
		let node, walker = document.createTreeWalker(templateElement.content, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
		(node = walker.nextNode()) && nextPatch < patches.length;
	) {
		if (node.nodeType === Node.TEXT_NODE) {
			const nodes = []
			for (const match of [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse()) {
				const regular = node.splitText(match.index + match[0].length)
				const dyn = node.splitText(match.index)
				nodes.push([dyn, match[1]])
				if (walker.nextSibling() !== dyn || walker.nextSibling() !== regular) throw new Error('oops')
			}

			let siblings
			for (const [node, idx] of nodes) {
				const child = (siblings ??= [...node.parentElement.childNodes]).indexOf(node)
				patch(node.parentElement, parseInt(idx), (node, value) => {
					node = node.childNodes[child]
					if (typeof value !== 'object') value = document.createTextNode(value)
					node.replaceWith(value)
				})
			}
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
						patch(node, parseInt(match[1]), (node, value) => {
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
						patch(node, parseInt(match[1]), (node, value) => {
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
						patch(node, parseInt(match[1]), (node, value) => {
							node.toggleAttribute(name, value)
						})
						break
					}

					// attribute:
					default: {
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) continue
						patch(node, parseInt(match[1]), (node, value) => {
							node.setAttribute(name, value)
						})
					}
				}
			}
			for (const name of toRemove) node.removeAttribute(name)
		}
	}

	patches.length = nextPatch

	return { content: templateElement.content, patches }
})

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
		if (this.#instance?.patches === template.patches) {
			this.#instance.update(dynamics)
		} else {
			this.#instance = new TemplateInstance(template, dynamics, this.#range)
		}
	}
}
