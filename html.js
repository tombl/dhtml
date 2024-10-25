export const html = (statics, ...dynamics) => new BoundTemplateInstance(statics, dynamics)

const emptyTemplate = () => html``
const singlePartTemplate = part => html`${part}`
const isRenderable = value => typeof value === 'object' && value !== null && 'render' in value

class BoundTemplateInstance {
	constructor(statics, dynamics) {
		this._template = compileTemplate(statics)
		this._dynamics = dynamics
	}
}

export class Root {
	constructor(range = document.createRange()) {
		this.range = range
	}

	static appendInto(parent) {
		const root = new Root()
		root.range.setStart(parent, parent.childNodes.length)
		root.range.setEnd(parent, parent.childNodes.length)
		return root
	}

	render(value) {
		if (!(value instanceof BoundTemplateInstance)) value = singlePartTemplate(value)
		const { _template: template, _dynamics: dynamics } = value
		if (this._instance?.template === template) {
			this._instance.update(dynamics)
		} else {
			this.detach()
			this._instance = new TemplateInstance(template, dynamics, this.range)
		}
	}

	detach() {
		if (this._instance === undefined) return

		// scan through all the parts of the previous tree, and clear any renderables.
		for (const { part } of this._instance.parts) part.detach()
	}
}

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
		// this also ensures that custom elements are upgraded before we do things
		// to them, like setting properties or attributes.
		range.deleteContents()
		range.insertNode(doc)

		for (const part of template.rootParts) nodeByPart[part] = range

		this.parts = Array(template.parts.length)
		for (let elementIdx = 0; elementIdx < template.parts.length; elementIdx++) {
			const [dynamicIdx, createPart] = template.parts[elementIdx]
			const part = createPart(this.parts, elementIdx)
			part.create(nodeByPart[elementIdx], dynamics[dynamicIdx])
			this.parts[elementIdx] = { idx: dynamicIdx, part }
		}
	}

	update(dynamics) {
		for (const { idx, part } of this.parts) part.update(dynamics[idx])
	}
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)/gi

function memo(fn) {
	const cache = new Map()
	return arg => {
		if (cache.has(arg)) return cache.get(arg)
		const value = fn(arg)
		cache.set(arg, value)
		return value
	}
}

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

	const walker = document.createTreeWalker(
		templateElement.content,
		5 /* NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT */,
	)
	while (nextPart < parts.length && walker.nextNode()) {
		const node = walker.currentNode
		if (node.nodeType === 3 /* Node.TEXT_NODE */) {
			const nodes = []
			// reverse the order of the matches so we don't need any extra bookkeeping.
			// by splitting the text starting from the end, we only have to split the original node.
			for (const match of [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse()) {
				node.splitText(match.index + match[0].length)
				const dyn = new Comment()
				node.splitText(match.index).replaceWith(dyn)
				nodes.push([dyn, match[1]])
			}

			// put them back in order, inverting the effect of the reverse above.
			// not relevant for behavior, but it satisfies the warning when parts are used out of order.
			nodes.reverse()

			let siblings
			for (const [node, idx] of nodes) {
				const child = (siblings ??= [...node.parentNode.childNodes]).indexOf(node)
				patch(node.parentNode, parseInt(idx), () => new ChildPart(child))
			}
		} else {
			const toRemove = []
			for (let name of node.getAttributeNames()) {
				const value = node.getAttribute(name)

				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					toRemove.push(name)
					const idx = parseInt(match[1])

					match = DYNAMIC_WHOLE.exec(value)
					const valueIdx = match === null ? null : parseInt(match[1])

					if (match === null) {
						if (DYNAMIC_GLOBAL.test(value)) throw new Error('Dynamic values for custom parts must be whole')
						patch(node, idx, () => new CustomPartStandalone(value))
					} else {
						patch(node, idx, () => new CustomPartName())
						patch(node, valueIdx, (parts, i) => new CustomPartValue(parts[i - 1].part))
					}
					continue
				}

				switch (name[0]) {
					// event:
					case '@': {
						toRemove.push(name)
						name = name.slice(1)
						match = DYNAMIC_WHOLE.exec(value)
						if (match === null) throw new Error('`@` attributes must be functions')
						patch(node, parseInt(match[1]), () => new EventPart(name))
						break
					}

					// property:
					case '.': {
						toRemove.push(name)
						name = name.slice(1)
						match = DYNAMIC_WHOLE.exec(value)
						if (match === null) throw new Error('`.` attributes must be properties')
						name = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
						patch(node, parseInt(match[1]), () => new PropertyPart(name))
						break
					}

					// attribute:
					default: {
						match = DYNAMIC_WHOLE.exec(value)
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

		if (value instanceof BoundTemplateInstance) {
			this.#root ??= new Root(this.#range)
			this.#root.render(value) // root.render will detach the previous tree if the template has changed.
		} else {
			// if we previously rendered a tree that might contain renderables,
			// and the template has changed (or we're not even rendering a template anymore),
			// we need to clear the old renderables.
			this.#root?.detach()
			this.#root = null

			if (this.#value != null && value !== null && !(this.#value instanceof Node) && !(value instanceof Node)) {
				// we previously rendered a string, and we're rendering a string again.
				this.#range.startContainer.childNodes[this.#range.startOffset].data = value
			} else {
				this.#range.deleteContents()
				if (value !== null) this.#range.insertNode(value instanceof Node ? value : new Text(value))
			}
		}

		this.#value = value
	}

	detach() {
		this.#setRenderable(null)
		this.#root?.detach() // root.detach and part.detach are mutually recursive, so this detaches children too.
		this.#root = null
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
			this.detach()
		} else {
			throw new Error(`Expected a function or null, got ${value}`)
		}
	}

	detach() {
		if (this.#attached) {
			this.#node.removeEventListener(this.#name, this.#handler)
			this.#attached = false
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

	detach() {
		delete this.#node[this.#name]
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
		if (typeof value === 'boolean') this.#node.toggleAttribute(this.#name, value)
		else if (value === null) this.#node.removeAttribute(this.#name)
		else this.#node.setAttribute(this.#name, value)
	}

	detach() {
		this.#node.removeAttribute(this.#name)
	}
}

class CustomPartBase {
	#node
	#instance
	#prevClass
	// abstract _value
	// abstract _class

	#instantiate() {
		this.#prevClass = this._class
		this.#instance = this._class == null ? null : new this._class(this.#node, this._value)
	}

	create(node) {
		this.#node = node
		this.#instantiate()
	}

	update() {
		if (this._class === this.#prevClass) {
			this.#instance?.update?.(this._value)
		} else {
			this.#instance?.detach?.()
			this.#instantiate()
		}
	}

	detach() {
		this.#instance?.detach?.()
		this.#instance = this.#prevClass = this._value = this._class = null
	}
}

class CustomPartStandalone extends CustomPartBase {
	constructor(value) {
		super()
		this._value = value
	}
	create(node, Class) {
		this._class = Class
		super.create(node)
	}
	update(Class) {
		this._class = Class
		super.update()
	}
}

class CustomPartName {
	create(_node, Class) {
		this._class = Class
	}
	update(Class) {
		this._class = Class
	}
	detach() {}
}

class CustomPartValue extends CustomPartBase {
	#namePart
	constructor(namePart) {
		super()
		this.#namePart = namePart
	}
	get _class() {
		return this.#namePart._class
	}
	set _class(Class) {
		this.#namePart._class = Class
	}

	create(node, value) {
		this._value = value
		super.create(node)
	}
	update(value) {
		this._value = value
		super.update()
	}
}
