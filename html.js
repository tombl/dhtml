const DEV = typeof DHTML_PROD === 'undefined' || !DHTML_PROD

/** @type {typeof Node.TEXT_NODE} */ const NODE_TYPE_TEXT = 3
/** @type {typeof Node.DOCUMENT_FRAGMENT_NODE} */ const NODE_TYPE_DOCUMENT_FRAGMENT = 11
/** @type {typeof NodeFilter.SHOW_ELEMENT} */ const NODE_FILTER_ELEMENT = 1
/** @type {typeof NodeFilter.SHOW_TEXT} */ const NODE_FILTER_TEXT = 4

export const html = (statics, ...dynamics) => new BoundTemplateInstance(statics, dynamics)

const singlePartTemplate = part => html`${part}`
const isRenderable = value => typeof value === 'object' && value !== null && 'render' in value
const isIterable = value => typeof value === 'object' && value !== null && Symbol.iterator in value

class Span {
	constructor(parentNode, start, end) {
		this.parentNode = parentNode
		this.start = start
		this.end = end
	}
	deleteContents() {
		while (this.end > this.start) this.parentNode.childNodes[--this.end].remove()
	}
	insertNode(node) {
		this.end += node.nodeType === NODE_TYPE_DOCUMENT_FRAGMENT ? node.childNodes.length : 1
		this.parentNode.insertBefore(node, this.parentNode.childNodes[this.start] ?? null)
	}
}

const BoundTemplateInstance = DEV
	? class BoundTemplateInstanceDev {
			constructor(statics, dynamics) {
				this._template = compileTemplate(statics)
				this._dynamics = dynamics
			}
	  }
	: class BoundTemplateInstanceProd {
			#template
			#statics
			get _template() {
				return (this.#template ??= compileTemplate(this.#statics))
			}
			constructor(statics, dynamics) {
				this.#statics = statics
				this._dynamics = dynamics
			}
	  }

export class Root {
	constructor(span) {
		this.span = span
	}

	static appendInto(parent) {
		return new Root(new Span(parent, parent.childNodes.length, parent.childNodes.length))
	}

	render(value) {
		if (!(value instanceof BoundTemplateInstance)) value = singlePartTemplate(value)
		const { _template: template, _dynamics: dynamics } = value
		if (this._instance?.template === template) {
			this._instance.update(dynamics)
		} else {
			this.detach()
			this._instance = new TemplateInstance(template, dynamics, this.span)
		}
	}

	detach() {
		if (this._instance === undefined) return

		// scan through all the parts of the previous tree, and clear any renderables.
		for (const { part } of this._instance.parts) part.detach()

		this._instance = undefined
	}
}

class TemplateInstance {
	constructor(template, dynamics, span) {
		this.template = template
		const doc = template.content.cloneNode(true)

		const nodeByPart = []
		for (const node of doc.querySelectorAll('[data-dyn-parts]')) {
			const parts = node.dataset.dynParts
			delete node.dataset.dynParts
			for (const part of parts.split(' ')) nodeByPart[part] = node
		}

		const nodeByStaticPart = []
		for (const node of doc.querySelectorAll('[data-dyn-static-parts]')) {
			const parts = node.dataset.dynStaticParts
			delete node.dataset.dynStaticParts
			for (const part of parts.split(' ')) nodeByStaticPart[part] = node
		}

		// the fragment must be inserted before the parts are constructed,
		// because they need to know their final location.
		// this also ensures that custom elements are upgraded before we do things
		// to them, like setting properties or attributes.
		span.deleteContents()
		span.insertNode(doc)

		for (let elementIdx = 0; elementIdx < template.staticParts.length; elementIdx++) {
			const [value, createPart] = template.staticParts[elementIdx]
			createPart().create(nodeByStaticPart[elementIdx], value)
		}

		for (const part of template.rootParts) nodeByPart[part] = span

		this.parts = Array(template.parts.length)
		for (let elementIdx = 0; elementIdx < template.parts.length; elementIdx++) {
			const [dynamicIdx, createPart] = template.parts[elementIdx]
			const part = createPart(this.parts, elementIdx, span)
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
	const staticParts = []
	const rootParts = []
	function patch(node, idx, part) {
		if (node.nodeType === NODE_TYPE_DOCUMENT_FRAGMENT) rootParts.push(nextPart)
		else if ('dynParts' in node.dataset) node.dataset.dynParts += ' ' + nextPart
		else node.dataset.dynParts = nextPart
		if (DEV && nextPart !== idx) console.warn('dynamic value detected in static location')
		parts[nextPart++] = [idx, part]
	}
	function staticPatch(node, value, part) {
		const nextStaticPart = staticParts.push([value, part]) - 1
		if ('dynStaticParts' in node.dataset) node.dataset.dynStaticParts += ' ' + nextStaticPart
		else node.dataset.dynStaticParts = nextStaticPart
	}

	const walker = document.createTreeWalker(templateElement.content, NODE_FILTER_TEXT | NODE_FILTER_ELEMENT)
	while (nextPart < parts.length && walker.nextNode()) {
		const node = walker.currentNode
		if (node.nodeType === NODE_TYPE_TEXT) {
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
				patch(node.parentNode, parseInt(idx), (_parts, _i, span) => new ChildPart(child, span))
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
						if (DEV && DYNAMIC_GLOBAL.test(value))
							throw new Error(`expected a whole dynamic value for ${name}, got a partial one`)
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
						if (DEV && match === null) throw new Error(`expected a whole dynamic value for ${name}, got a partial one`)
						patch(node, parseInt(match[1]), () => new EventPart(name))
						break
					}

					// property:
					case '.': {
						toRemove.push(name)
						name = name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
						match = DYNAMIC_WHOLE.exec(value)
						if (match === null) {
							if (DEV && DYNAMIC_GLOBAL.test(value))
								throw new Error(`expected a whole dynamic value for ${name}, got a partial one`)
							staticPatch(node, value, () => new PropertyPart(name))
						} else {
							patch(node, parseInt(match[1]), () => new PropertyPart(name))
						}
						break
					}

					// attribute:
					default: {
						match = DYNAMIC_WHOLE.exec(value)
						if (match === null) {
							if (DEV && DYNAMIC_GLOBAL.test(value))
								throw new Error(`expected a whole dynamic value for ${name}, got a partial one`)
							continue
						}
						patch(node, parseInt(match[1]), () => new AttributePart(name))
					}
				}
			}
			for (const name of toRemove) node.removeAttribute(name)
		}
	}

	parts.length = nextPart

	return { content: templateElement.content, parts, staticParts, rootParts }
})

const controllers = new WeakMap()
export function invalidate(renderable) {
	const controller = controllers.get(renderable)
	if (!controller || controller.invalidateQueued) return
	controller.invalidateQueued = true
	return Promise.resolve().then(() => {
		controller.invalidateQueued = false
		controller.invalidate()
	})
}
export function onUnmount(renderable, callback) {
	const controller = controllers.get(renderable)
	if (!controller) return // TODO: throw here?
	;(controller.unmountCallbacks ??= new Set()).add(callback)
}

class ChildPart {
	#childIndex
	#parentSpan
	constructor(idx, span) {
		this.#childIndex = idx
		this.#parentSpan = span
	}

	#span
	create(node, value) {
		if (node instanceof Span) {
			this.#span = new Span(node.parentNode, node.start + this.#childIndex, node.start + this.#childIndex + 1)
		} else {
			this.#span = new Span(node, this.#childIndex, this.#childIndex + 1)
		}
		this.#childIndex = undefined // we only need this once.

		this.update(value)
	}

	// for when we're rendering a renderable:
	#renderable = null

	// for when we're rendering a template:
	#root = null

	// for when we're rendering multiple values:
	#roots

	// for when we're rendering a string/single dom node:
	/** undefined means no previous value, because a user-specified undefined is remapped to null */
	#value

	#switchRenderable(next) {
		if (this.#renderable === next) return
		if (this.#renderable) {
			const controller = controllers.get(this.#renderable)
			if (controller?.unmountCallbacks) for (const callback of controller.unmountCallbacks) callback()
			controllers.delete(this.#renderable)
		}
		this.#renderable = next
	}

	#disconnectRoot() {
		// root.detach and part.detach are mutually recursive, so this detaches children too.
		this.#root?.detach()
		this.#root = null
	}

	update(value) {
		if (isRenderable(value)) {
			this.#switchRenderable(value)

			const renderable = value

			if (!controllers.has(renderable))
				controllers.set(renderable, {
					invalidateQueued: false,
					invalidate: () => {
						if (this.#renderable !== renderable) {
							if (DEV) throw new Error('could not invalidate an outdated renderable')
							else return
						}
						this.update(renderable)
					},
					unmountCallbacks: null, // will be upgraded to a Set if needed.
				})

			value = renderable.render()

			// if render returned another renderable, we want to track/cache both renderables individually.
			// wrap it in a nested ChildPart so that each can be tracked without ChildPart having to handle multiple renderables.
			if (isRenderable(value)) value = singlePartTemplate(value)
		} else this.#switchRenderable(null)

		// if it's undefined, swap the value for null.
		// this means if the initial value is undefined,
		// it won't conflict with this.#value's default of undefined,
		// so it'll still render.
		if (value === undefined) value = null

		// NOTE: we're explicitly not caching/diffing the value when it's an iterable,
		// given it can yield different values but have the same identity. (e.g. arrays)
		if (isIterable(value)) {
			if (!this.#roots) {
				// we previously rendered a single value, so we need to clear it.
				this.#disconnectRoot()
				this.#span.deleteContents()

				this.#roots = []
			}

			let i = 0
			let offset = this.#span.start
			for (const item of value) {
				let root = this.#roots[i++]
				// this is either the initial creation, or the iterable has grown.
				root ??= this.#roots[i - 1] = new Root(new Span(this.#span.parentNode, offset, offset))
				root.render(item)
				offset = root.span.end
			}

			// and now we need to remove anything if the iterable has shrunk.
			while (this.#roots.length > i) {
				const root = this.#roots.pop()
				root.detach()
				root.span.deleteContents()
			}

			this.#span.end = this.#roots[this.#roots.length - 1].span.end

			return
		} else if (this.#roots) {
			for (const root of this.#roots) root.detach()
			this.#roots = null
		}

		// now early return if the value hasn't changed.
		if (Object.is(value, this.#value)) return

		if (value instanceof BoundTemplateInstance) {
			this.#root ??= new Root(this.#span)
			this.#root.render(value) // root.render will detach the previous tree if the template has changed.
		} else {
			// if we previously rendered a tree that might contain renderables,
			// and the template has changed (or we're not even rendering a template anymore),
			// we need to clear the old renderables.
			this.#disconnectRoot()

			if (this.#value != null && value !== null && !(this.#value instanceof Node) && !(value instanceof Node)) {
				// we previously rendered a string, and we're rendering a string again.
				this.#span.parentNode.childNodes[this.#span.start].data = value
			} else {
				this.#span.deleteContents()
				if (value !== null) this.#span.insertNode(value instanceof Node ? value : new Text(value))
			}
		}

		if (this.#span.parentNode === this.#parentSpan.parentNode && this.#span.end > this.#parentSpan.start) {
			this.#parentSpan.end = this.#span.end
		}

		this.#value = value
	}

	detach() {
		this.#switchRenderable(null)
		this.#disconnectRoot()
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
		} else if (DEV) {
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
		this.#instance =
			this._class == null
				? null
				: 'prototype' in this._class
				? new this._class(this.#node, this._value)
				: this._class(this.#node, this._value)
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
