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

	#range
	create(node, value) {
		this.#range = document.createRange()
		if (node instanceof Range) {
			this.#range.setStart(node.startContainer, node.startOffset + this.#childIndex)
			this.#range.setEnd(node.startContainer, node.startOffset + this.#childIndex + 1)
		} else {
			this.#range.selectNode(node.childNodes[this.#childIndex])
		}
		this.update(value)
	}

	#root = null
	update(value) {
		let template

		if (typeof value === 'object' && 'render' in value) {
			value = value.render()
		}

		if (typeof value === 'object' && TAG_TEMPLATE in value) {
			template = value
			value = document.createComment('')
		} else if (!(value instanceof Node)) {
			value = document.createTextNode(value)
		}

		if (template) {
			this.#root ??= new Root(this.#range)
			this.#root.render(template)
		} else {
			this.#root = null
			this.#range.deleteContents()
			this.#range.insertNode(value)
		}
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
	const rootParts = []
	function patch(node, idx, part) {
		if (node.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */) rootParts.push(nextPart)
		else if ('dynParts' in node.dataset) node.dataset.dynParts += ' ' + nextPart
		else node.dataset.dynParts = nextPart
		if (nextPart !== idx) console.warn('dynamic value detected in static location')
		parts[nextPart++] = [idx, part]
	}

	for (
		let walker = document.createTreeWalker(templateElement.content, 5 /* NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT */);
		nextPart < parts.length && walker.nextNode();
	) {
		const node = walker.currentNode
		if (node.nodeType === 3 /* Node.TEXT_NODE */) {
			const nodes = []
			for (const match of [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse()) {
				node.splitText(match.index + match[0].length)
				const dyn = node.splitText(match.index)
				nodes.push([dyn, match[1]])

				// skip the two nodes we just created
				walker.nextNode()
				walker.nextNode()
			}

			let siblings
			for (const [node, idx] of nodes) {
				const child = (siblings ??= [...node.parentNode.childNodes]).indexOf(node)
				patch(node.parentNode, parseInt(idx), () => new ChildPart(child))
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

	return { content: templateElement.content, parts, rootParts }
})

export const html = (statics, ...dynamics) => ({
	[TAG_TEMPLATE]: compileTemplate(statics),
	[TAG_DYNAMICS]: dynamics,
})

class TemplateInstance {
	constructor(template, dynamics, range) {
		this.template = template
		const doc = template.content.cloneNode(true)
		const nodeByPart = []

		for (const node of doc.querySelectorAll('[data-dyn-parts]')) {
			const parts = node.dataset.dynParts
			delete node.dataset.dynParts
			for (const part of parts.split(' ')) nodeByPart[part] = node
		}

		// the fragment must be inserted before the parts are constructed,
		// because they need to know their final location.
		range.deleteContents()
		range.insertNode(doc)

		for (const part of template.rootParts) nodeByPart[part] = range

		this.parts = template.parts.map(([dynamicIdx, createPart], elementIdx) => {
			const part = createPart()
			part.create(nodeByPart[elementIdx], dynamics[dynamicIdx])
			return [dynamicIdx, part]
		})
	}

	update(dynamics) {
		for (const [idx, part] of this.parts) part.update(dynamics[idx])
	}
}

export class Root {
	constructor(range = document.createRange()) {
		this.range = range
	}

	static appendInto(parent) {
		const comment = document.createComment('')
		parent.appendChild(comment)
		const root = new Root()
		root.range.selectNode(comment)
		return root
	}

	#instance
	render({ [TAG_TEMPLATE]: template, [TAG_DYNAMICS]: dynamics }) {
		if (this.#instance?.template === template) {
			this.#instance.update(dynamics)
		} else {
			this.#instance = new TemplateInstance(template, dynamics, this.range)
		}
	}
}
