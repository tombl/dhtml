/** @import {
	CompiledTemplate,
	CustomPartConstructor,
	CustomPartInstance,
	Displayable,
	Part,
	Renderable,
	Span as SpanInstance
} from './types' */

const DEV = typeof DHTML_PROD === 'undefined' || !DHTML_PROD

/** @type {typeof NodeFilter.SHOW_ELEMENT} */ const NODE_FILTER_ELEMENT = 1
/** @type {typeof NodeFilter.SHOW_TEXT} */ const NODE_FILTER_TEXT = 4

/** @return {node is Element} */
const isElement = node => node.nodeType === /** @satisfies {typeof Node.ELEMENT_NODE} */ (1)

/** @return {node is Text} */
const isTextNode = node => node.nodeType === /** @satisfies {typeof Node.TEXT_NODE} */ (3)

/** @return {node is DocumentFragment} */
const isDocumentFragment = node => node.nodeType === /** @satisfies {typeof Node.DOCUMENT_FRAGMENT_NODE} */ (11)

export const html = (statics, ...dynamics) => new BoundTemplateInstance(statics, dynamics)

const singlePartTemplate = part => html`${part}`

/** @return {value is Renderable} */
const isRenderable = value => typeof value === 'object' && value !== null && 'render' in value

/** @return {value is Iterable<unknown>} */
const isIterable = value => typeof value === 'object' && value !== null && Symbol.iterator in value

/** @return {asserts value} */
const assert = (value, message = 'assertion failed') => {
	if (!DEV) return
	if (!value) throw new Error(message)
}

const flash =
	DEV && new URLSearchParams(location.search).has('flash')
		? (node, r, g, b) => {
				if (isElement(node))
					return node.animate(
						[
							{ boxShadow: `0 0 0 1px rgba(${r}, ${g}, ${b}, 1)` },
							{ boxShadow: `0 0 0 1px rgba(${r}, ${g}, ${b}, 0)` },
						],
						{
							duration: 200,
						},
					).finished
			}
		: undefined

/** @implements {SpanInstance} */
class Span {
	/**
	 * @param {ParentNode} parentNode
	 * @param {number} start
	 * @param {number} end
	 */
	constructor(parentNode, start, end) {
		this.parentNode = parentNode
		this._start = start
		this._end = end
	}
	_deleteContents() {
		// optimization for clearing when we own the entire parent.
		if (this._start === 0 && this._end >= this.parentNode.childNodes.length) {
			if (DEV && this._end !== this.parentNode.childNodes.length) console.warn('end is past the end of the parent')
			this.parentNode.textContent = ''
			this._end = 0
			return
		}
		while (this._end > this._start) {
			const node = this.parentNode.childNodes[--this._end]
			if (flash && node instanceof HTMLElement) {
				const box = node.getBoundingClientRect()
				const cloned = /** @type {HTMLElement} */ (node.cloneNode(true))
				node.remove()
				Object.assign(cloned.style, {
					position: 'absolute',
					top: box.top + 'px',
					left: box.left + 'px',
					width: box.width + 'px',
					height: box.height + 'px',
					pointerEvents: 'none',
				})
				document.body.appendChild(cloned)
				Promise.resolve(flash(cloned, 255, 0, 0)).then(() => cloned.remove())
			} else {
				node.remove()
			}
		}
	}
	_insertNode(node) {
		const length = isDocumentFragment(node) ? node.childNodes.length : 1
		this.parentNode.insertBefore(node, this.parentNode.childNodes[this._end] ?? null)
		this._end += length
		if (flash) for (const node of this) flash(node, 0, 255, 0)
	}
	*[Symbol.iterator]() {
		for (let i = this._start; i < this._end; i++) yield this.parentNode.childNodes[i]
	}
	_extractContents() {
		const fragment = document.createDocumentFragment()
		while (this._end > this._start) fragment.prepend(this.parentNode.childNodes[--this._end])
		return fragment
	}
	get length() {
		return this._end - this._start
	}
}

if (DEV) {
	Span.prototype.toString = function () {
		let result = ''
		for (const node of this) result += /** @type {HTMLElement} */ (node).outerHTML ?? String(node)
		return result
	}
}

class BoundTemplateInstance {
	/** @type {CompiledTemplate | undefined} */ #template
	/** @type {TemplateStringsArray} */ #statics

	get _template() {
		return (this.#template ??= compileTemplate(this.#statics))
	}

	constructor(statics, dynamics) {
		this.#statics = statics
		this._dynamics = dynamics

		// just to check for errors
		if (DEV) compileTemplate(statics)
	}
}

export class Root {
	constructor(span) {
		this._span = span
	}

	static appendInto(parent) {
		return new Root(new Span(parent, parent.childNodes.length, parent.childNodes.length))
	}

	static replace(node) {
		const index = [...node.parentNode.childNodes].indexOf(node)
		return new Root(new Span(node.parentNode, index, index + 1))
	}

	render(value) {
		const t = value instanceof BoundTemplateInstance ? value : singlePartTemplate(value)

		if (this._instance?.template === t._template) {
			this._instance.update(t._dynamics)
		} else {
			this.detach()
			this._instance = new TemplateInstance(t._template, t._dynamics, this._span)
		}
	}

	detach() {
		if (!this._instance) return
		// scan through all the parts of the previous tree, and clear any renderables.
		for (const [_idx, part] of this._instance._parts) part.detach()
		delete this._instance
	}
}

class TemplateInstance {
	/**
	 * @param {CompiledTemplate} template
	 * @param {Displayable[]} dynamics
	 * @param {Span} span
	 */
	constructor(template, dynamics, span) {
		this.template = template
		const doc = /** @type {DocumentFragment} */ (template._content.cloneNode(true))

		const nodeByPart = []
		for (const node of doc.querySelectorAll('[data-dynparts]')) {
			const parts = node.getAttribute('data-dynparts')
			assert(parts)
			node.removeAttribute('data-dynparts')
			for (const part of parts.split(' ')) nodeByPart[part] = node
		}

		const nodeByStaticPart = []
		for (const node of doc.querySelectorAll('[data-dynstaticparts]')) {
			const parts = node.getAttribute('data-dynstaticparts')
			assert(parts)
			node.removeAttribute('data-dynstaticparts')
			for (const part of parts.split(' ')) nodeByStaticPart[part] = node
		}

		for (const part of template._rootParts) nodeByPart[part] = span

		// the fragment must be inserted before the parts are constructed,
		// because they need to know their final location.
		// this also ensures that custom elements are upgraded before we do things
		// to them, like setting properties or attributes.
		span._deleteContents()
		span._insertNode(doc)

		template._staticParts.map(([value, createPart], elementIdx) =>
			createPart().create(nodeByStaticPart[elementIdx], value),
		)

		let prev
		this._parts = template._parts.map(([dynamicIdx, createPart], elementIdx) => {
			const part = createPart(prev, span)
			part.create(nodeByPart[elementIdx], dynamics[dynamicIdx])
			prev = part
			return /** @type {const} */ ([dynamicIdx, part])
		})
	}

	update(dynamics) {
		for (const [idx, part] of this._parts) part.update(dynamics[idx])
	}
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)/gi

/** @type {Map<TemplateStringsArray, CompiledTemplate>} */
const templates = new Map()
/** @param {TemplateStringsArray} statics */
function compileTemplate(statics) {
	const cached = templates.get(statics)
	if (cached) return cached

	const templateElement = document.createElement('template')
	templateElement.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}`), '')

	let nextPart = 0
	/** @type {CompiledTemplate} */
	const compiled = {
		_content: templateElement.content,
		_parts: Array(statics.length - 1),
		_staticParts: [],
		_rootParts: [],
	}

	function patch(node, idx, createPart) {
		if (isDocumentFragment(node)) compiled._rootParts.push(nextPart)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + nextPart
		else node.dataset.dynparts = nextPart
		if (DEV && nextPart !== idx) console.warn('dynamic value detected in static location')
		compiled._parts[nextPart++] = [idx, createPart]
	}
	function staticPatch(node, value, createPart) {
		const nextStaticPart = compiled._staticParts.push([value, createPart]) - 1
		if ('dynstaticparts' in node.dataset) node.dataset.dynstaticparts += ' ' + nextStaticPart
		else node.dataset.dynstaticparts = nextStaticPart
	}

	const walker = document.createTreeWalker(templateElement.content, NODE_FILTER_TEXT | NODE_FILTER_ELEMENT)
	while (nextPart < compiled._parts.length && walker.nextNode()) {
		const node = /** @type {Text | Element} */ (walker.currentNode)
		if (isTextNode(node)) {
			const nodes = [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse().map(match => {
				node.splitText(match.index + match[0].length)
				const dyn = new Comment()
				node.splitText(match.index).replaceWith(dyn)
				return /** @type {const} */ ([dyn, parseInt(match[1])])
			})

			// put them back in order, inverting the effect of the reverse above.
			// not relevant for behavior, but it satisfies the warning when parts are used out of order.
			nodes.reverse()

			if (nodes.length) {
				DEV: assert(node.parentNode !== null, 'all text nodes should have a parent node')
				let siblings = [...node.parentNode.childNodes]
				for (const [node, idx] of nodes) {
					const child = siblings.indexOf(node)
					patch(node.parentNode, idx, (_prev, span) => new ChildPart(child, span))
				}
			}
		} else {
			const toRemove = []
			for (let name of node.getAttributeNames()) {
				const value = node.getAttribute(name)
				assert(value !== null)

				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					toRemove.push(name)
					const idx = parseInt(match[1])

					match = DYNAMIC_WHOLE.exec(value)

					if (match) {
						patch(node, idx, () => new CustomPartName())
						patch(node, parseInt(match[1]), prev => new CustomPartValue(prev))
					} else {
						DEV: assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
						patch(node, idx, () => new CustomPartStandalone(value))
					}
					continue
				}

				if (name[0] === '@') {
					// event:
					toRemove.push(name)
					match = DYNAMIC_WHOLE.exec(value)
					name = name.slice(1)
					assert(match, `expected a whole dynamic value for ${name}, got a partial one`)
					patch(node, parseInt(match[1]), () => new EventPart(name))
				} else if (name[0] === '.') {
					// property:
					toRemove.push(name)
					match = DYNAMIC_WHOLE.exec(value)
					name = name.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
					if (match) {
						patch(node, parseInt(match[1]), () => new PropertyPart(name))
					} else {
						DEV: assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
						staticPatch(node, value, () => new PropertyPart(name))
					}
				} else {
					// attribute:
					match = DYNAMIC_WHOLE.exec(value)
					if (match) {
						patch(node, parseInt(match[1]), () => new AttributePart(name))
					} else {
						DEV: assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
					}
				}
			}
			for (const name of toRemove) node.removeAttribute(name)
		}
	}

	compiled._parts.length = nextPart

	templates.set(statics, compiled)
	return compiled
}

const controllers = new WeakMap()
export function invalidate(renderable) {
	const controller = controllers.get(renderable)
	if (controller) {
		// TODO: cancel this invalidation if a higher up one comes along
		return (controller._invalidateQueued ??= Promise.resolve().then(() => {
			controller._invalidateQueued = null
			controller._invalidate()
		}))
	} else if (DEV) {
		throw new Error('could not invalidate a non-rendered renderable')
		// TODO: check again in a microtask?
		// just in case the renderable was created between invalidation and rerendering
	}
}
export function onUnmount(renderable, callback) {
	const controller = controllers.get(renderable)
	if (controller) {
		;(controller._unmountCallbacks ??= new Set()).add(callback)
	} else {
		// TODO: throw here?
	}
}

/** @implements {Part} */
class ChildPart {
	#childIndex
	#parentSpan
	constructor(idx, span) {
		this.#childIndex = idx
		this.#parentSpan = span
	}

	#span
	create(node, value) {
		this.#span =
			node instanceof Span
				? new Span(node.parentNode, node._start + this.#childIndex, node._start + this.#childIndex + 1)
				: new Span(node, this.#childIndex, this.#childIndex + 1)

		this.#childIndex = undefined // we only need this once.

		this.update(value)
	}

	// for when we're rendering a renderable:
	/** @type {Renderable | null} */ #renderable = null

	// for when we're rendering a template:
	/** @type {Root | undefined} */ #root

	// for when we're rendering multiple values:
	/** @type {Root[] | undefined} */ #roots

	// for when we're rendering a string/single dom node:
	/** undefined means no previous value, because a user-specified undefined is remapped to null */
	#value

	/** @param {Renderable | null} next */
	#switchRenderable(next) {
		if (this.#renderable && this.#renderable !== next) {
			const controller = controllers.get(this.#renderable)
			if (controller?._unmountCallbacks) for (const callback of controller._unmountCallbacks) callback()
			controllers.delete(this.#renderable)
		}
		this.#renderable = next
	}

	#disconnectRoot() {
		// root.detach and part.detach are mutually recursive, so this detaches children too.
		this.#root?.detach()
		this.#root = undefined
	}

	/** @param {Displayable} value */
	update(value) {
		if (isRenderable(value)) {
			this.#switchRenderable(value)

			const renderable = value

			if (!controllers.has(renderable))
				controllers.set(renderable, {
					_invalidateQueued: null,
					_invalidate: () => {
						assert(this.#renderable === renderable, 'could not invalidate an outdated renderable')
						this.update(renderable)
					},
					_unmountCallbacks: null, // will be upgraded to a Set if needed.
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
				this.#span._deleteContents()

				this.#roots = []
			}

			// create or update a root for every item.
			let i = 0
			let offset = this.#span._end
			for (const item of value) {
				const root = (this.#roots[i] ??= new Root(new Span(this.#span.parentNode, offset, offset)))
				root.render(item)
				offset = root._span._end
				i++
			}

			// and now remove excess roots if the iterable has shrunk.
			while (this.#roots.length > i) {
				const root = /** @type {Root} */ (this.#roots.pop())
				root.detach()
				root._span._deleteContents()
			}

			this.#span._end = this.#roots[this.#roots.length - 1]?._span._end ?? this.#span._start

			return
		} else if (this.#roots) {
			for (const root of this.#roots) root.detach()
			this.#roots = undefined
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
				this.#span.parentNode.childNodes[this.#span._start].data = value
			} else {
				this.#span._deleteContents()
				if (value !== null) this.#span._insertNode(value instanceof Node ? value : new Text(value.toString()))
			}
		}

		// if we've grown past the end of our parent, update their end.
		if (this.#span.parentNode === this.#parentSpan.parentNode && this.#span._end > this.#parentSpan._start) {
			// TODO: does this need to also apply for shrinkage?
			this.#parentSpan._end = this.#span._end
		}

		this.#value = value
	}

	detach() {
		this.#switchRenderable(null)
		this.#disconnectRoot()
	}
}

/** @implements {Part} */
class EventPart {
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
		this.handleEvent = value
		if (value === null) {
			this.detach()
		} else if (DEV && typeof value !== 'function') {
			throw new Error(`Expected a function or null, got ${value}`)
		} else {
			this.#node.addEventListener(this.#name, this)
		}
	}

	detach() {
		this.#node.removeEventListener(this.#name, this)
	}
}

/** @implements {Part} */
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

/** @implements {Part} */
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

/** @implements {Part} */
class CustomPartBase {
	#node
	/** @type {CustomPartInstance | undefined | null} */
	#instance
	/** @type {CustomPartConstructor | null | undefined} */
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

/** @implements {Part} */
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

	// @ts-expect-error -- property in parent, accessor in subclass
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
