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

class ChildPart {
	#childIndex
	constructor(idx) {
		this.#childIndex = idx
	}

	#node
	create(node, value) {
		this.#node = node.childNodes[this.#childIndex]
		this.update(value)
	}

	update(value) {
		if (typeof value !== 'object') value = document.createTextNode(value)
		console.assert(value instanceof Node, 'Expected a Node, got', value)
		this.#node.replaceWith(value)
		this.#node = value
	}
}

class EventPart {
	#name
	constructor(name) {
		this.#name = name
	}

	#attached = false
	#handler = {}
	#node
	create(node, value) {
		this.#node = node
		this.update(value)
	}

	update(value) {
		this.#handler.handleEvent = value
		if (typeof value === 'function') {
			if (!this.#attached) {
				this.#node.addEventListener(this.#name, this.#handler)
				this.#attached = true
			}
		} else if (value === null) {
			if (this.#attached) {
				this.#node.removeEventListener(this.#name, this.#handler)
				this.#attached = false
			}
		} else {
			throw new Error(`Expected a function or null, got ${value}`)
		}
	}
}

class PropertyPart {
	#name
	constructor(name) {
		this.#name = name
	}

	#node
	create(node, value) {
		this.#node = node
		this.update(value)
	}

	update(value) {
		this.#node[this.#name] = value
	}
}

class BooleanAttributePart {
	#name
	constructor(name) {
		this.#name = name
	}

	#node
	create(node, value) {
		this.#node = node
		this.update(value)
	}

	update(value) {
		this.#node.toggleAttribute(this.#name, value)
	}
}

class AttributePart {
	#name
	constructor(name) {
		this.#name = name
	}

	#node
	create(node, value) {
		this.#node = node
		this.update(value)
	}

	update(value) {
		if (value === null) this.#node.removeAttribute(this.#name)
		else this.#node.setAttribute(this.#name, value)
	}
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)/gi
const compileTemplate = memo(statics => {
	const templateElement = document.createElement('template')
	templateElement.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}`), '')

	let nextPart = 0
	const parts = Array(statics.length - 1)
	function patch(node, idx, part) {
		if ('dynParts' in node.dataset) node.dataset.dynParts += ' ' + nextPart
		else node.dataset.dynParts = nextPart
		if (nextPart !== idx) console.warn('dynamic value detected in static location')
		parts[nextPart++] = [idx, part]
	}

	for (
		let walker = document.createTreeWalker(templateElement.content, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
		nextPart < parts.length && walker.nextNode();
	) {
		const node = walker.currentNode
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
				patch(node.parentElement, parseInt(idx), () => new ChildPart(child))
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
						patch(node, parseInt(match[1]), () => new EventPart(name))
						break
					}

					// property:
					case '.': {
						toRemove.push(name)
						name = name.slice(1)
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) throw new Error('`.` attributes must be properties')
						patch(node, parseInt(match[1]), () => new PropertyPart(name))
						break
					}

					// boolean attribute:
					case '?': {
						toRemove.push(name)
						name = name.slice(1)
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) throw new Error('`?` attributes must be booleans')
						patch(node, parseInt(match[1]), () => new BooleanAttributePart(name))
						break
					}

					// attribute:
					default: {
						const match = DYNAMIC_WHOLE.exec(value)
						if (match === null) continue
						patch(node, parseInt(match[1]), () => new AttributePart(name))
					}
				}
			}
			for (const name of toRemove) node.removeAttribute(name)
		}
	}

	parts.length = nextPart

	return { content: templateElement.content, parts }
})

export const html = (statics, ...dynamics) => ({
	[TAG_TEMPLATE]: compileTemplate(statics),
	[TAG_DYNAMICS]: dynamics,
})

class TemplateInstance {
	constructor(template, dynamics, range) {
		const doc = template.content.cloneNode(true)
		const elementByPart = []

		for (const el of doc.querySelectorAll('[data-dyn-parts]')) {
			const parts = el.dataset.dynParts
			delete el.dataset.dynParts
			for (const part of parts.split(' ')) elementByPart[part] = el
		}

		this.parts = template.parts.map(([dynamicIdx, createPart], elementIdx) => {
			const part = createPart()
			part.create(elementByPart[elementIdx], dynamics[dynamicIdx])
			return part
		})

		range.deleteContents()
		range.insertNode(doc)
	}

	update(dynamics) {
		for (const [part, idx] of this.parts) part.update(dynamics[idx])
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
		if (this.#instance?.parts === template.parts) {
			this.#instance.update(dynamics)
		} else {
			this.#instance = new TemplateInstance(template, dynamics, this.#range)
		}
	}
}
