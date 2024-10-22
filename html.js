function memo(fn) {
	const cache = new Map()
	return arg => {
		if (cache.has(arg)) return cache.get(arg)
		const value = fn(arg)
		cache.set(arg, value)
		return value
	}
}

const emptyTemplate = () => html``
const singlePartTemplate = part => html`${part}`
const isRenderable = value => typeof value === 'object' && value !== null && 'render' in value

class ChildPart {
	#childIndex
	constructor(idx) {
		this.#childIndex = idx
	}

	#range = document.createRange()
	create(node, value) {
		if (node instanceof Range) {
			this.#range.setStart(node.startContainer, node.startOffset + this.#childIndex)
			this.#range.setEnd(node.startContainer, node.startOffset + this.#childIndex + 1)
		} else {
			this.#range.selectNode(node.childNodes[this.#childIndex])
		}
		this.update(value)
	}

	#root = null
	#value = undefined
	#renderable = null
	#renderController = null
	#abortController = null

	#setRenderable(next) {
		if (this.#renderable === next) return

		this.#abortController?.abort()
		this.#renderController = this.#abortController = null

		this.#renderable = next
	}

	#clearChildren() {
		// scan through all the parts of the previous tree, and clear any renderables.
		for (const [, part] of this.#root._instance.parts) {
			if (part instanceof ChildPart) {
				part.#setRenderable(null)
				if (part.#value instanceof BoundTemplateInstance) part.#clearChildren()
			}
		}
	}

	update(value) {
		if (isRenderable(value)) {
			this.#setRenderable(value)

			const self = this
			this.#renderController ??= {
				invalidate() {
					if (self.#renderable !== renderable) throw new Error('Could not invalidate an outdated renderable')
					self.update(renderable)
				},
				get signal() {
					self.#abortController ??= new AbortController()
					return self.#abortController.signal
				},
			}

			const renderable = value
			value = renderable.render(this.#renderController)
			if (value === renderable) {
				console.warn(
					'Renderable %o returned itself, this is a mistake and would result in infinite recursion',
					renderable,
				)
				value = emptyTemplate()
			}

			// if render returned another renderable, we want to track/cache both renderables individually.
			// wrap it in a nested ChildPart so that each can be tracked without ChildPart having to handle multiple renderables.
			if (isRenderable(value)) value = singlePartTemplate(value)
		} else this.#setRenderable(null)

		// if it's undefined, swap the value for null.
		// this means if the initial value is undefined,
		// it won't conflict with previousValue's default of undefined,
		// so it'll still render.
		if (value === undefined) value = null

		// now early return if the value hasn't changed.
		if (value === this.#value) return

		// if we previously rendered a tree that might contain renderables,
		// and the template has changed (or we're not even rendering a template anymore),
		// we need to clear the old renderables.
		if (
			this.#value instanceof BoundTemplateInstance &&
			(!(value instanceof BoundTemplateInstance) || this.#value._template !== value._template)
		)
			this.#clearChildren()

		this.#value = value

		if (value instanceof BoundTemplateInstance) {
			this.#root ??= new Root(this.#range)
			this.#root.render(value)
		} else {
			this.#root = null
			this.#range.deleteContents()
			if (value !== null) this.#range.insertNode(value instanceof Node ? value : new Text(value))
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
		let walker = document.createTreeWalker(
			templateElement.content,
			5 /* NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT */,
		);
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

class BoundTemplateInstance {
	constructor(statics, dynamics) {
		this._template = compileTemplate(statics)
		this._dynamics = dynamics
	}
}

export const html = (statics, ...dynamics) => new BoundTemplateInstance(statics, dynamics)

export class Root {
	constructor(range = document.createRange()) {
		this.range = range
	}

	static appendInto(parent) {
		const comment = new Comment()
		parent.appendChild(comment)
		const root = new Root()
		root.range.selectNode(comment)
		return root
	}

	render(value) {
		if (!(value instanceof BoundTemplateInstance)) value = singlePartTemplate(value)
		const { _template: template, _dynamics: dynamics } = value
		if (this._instance?.template === template) {
			this._instance.update(dynamics)
		} else {
			this._instance = new TemplateInstance(template, dynamics, this.range)
		}
	}
}
