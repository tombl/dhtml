/** @import {
	Cleanup,
	CompiledTemplate,
	Directive,
	Displayable,
	Key,
	Part,
	Renderable,
	Span as SpanInstance
} from './types' */

const DEV = typeof DHTML_PROD === 'undefined' || !DHTML_PROD

/** @type {typeof NodeFilter.SHOW_ELEMENT} */ const NODE_FILTER_ELEMENT = 1
/** @type {typeof NodeFilter.SHOW_TEXT} */ const NODE_FILTER_TEXT = 4
/** @type {typeof NodeFilter.SHOW_COMMENT} */ const NODE_FILTER_COMMENT = 128

/** @return {node is Element} */
const isElement = node => node.nodeType === /** @satisfies {typeof Node.ELEMENT_NODE} */ (1)

/** @return {node is Text} */
const isText = node => node.nodeType === /** @satisfies {typeof Node.TEXT_NODE} */ (3)

/** @return {node is Comment} */
const isComment = node => node.nodeType === /** @satisfies {typeof Node.COMMENT_NODE} */ (8)

/** @return {node is DocumentFragment} */
const isDocumentFragment = node => node.nodeType === /** @satisfies {typeof Node.DOCUMENT_FRAGMENT_NODE} */ (11)

/** @return {value is Renderable} */
const isRenderable = value => typeof value === 'object' && value !== null && 'render' in value

/** @return {value is Iterable<unknown>} */
const isIterable = value => typeof value === 'object' && value !== null && Symbol.iterator in value

export const html = (statics, ...dynamics) => new BoundTemplateInstance(statics, dynamics)

const singlePartTemplate = part => html`${part}`

/* v8 ignore start */
/** @return {asserts value} */
const assert = (value, message = 'assertion failed') => {
	if (!DEV) return
	if (!value) throw new Error(message)
}
/* v8 ignore stop */

/** @implements {SpanInstance} */
class Span {
	/**
	 * @param {Node} node the only node in the span
	 */
	constructor(node) {
		DEV: assert(node.parentNode !== null)
		this._parentNode = node.parentNode
		this._start = this._end = node
	}

	_deleteContents() {
		this._marker = new Text()
		this._parentNode.insertBefore(this._marker, this._start)

		for (const node of this) this._parentNode.removeChild(node)

		this._start = this._end = this._marker
	}

	/** @param {Node} node */
	_insertNode(node) {
		const end = isDocumentFragment(node) ? node.lastChild : node
		if (end === null) return // empty fragment
		this._parentNode.insertBefore(node, this._end.nextSibling)
		this._end = end

		if (this._start === this._marker) {
			DEV: assert(this._start.nextSibling)
			this._start = this._start.nextSibling

			this._parentNode.removeChild(this._marker)
			this._marker = null
		}
	}
	*[Symbol.iterator]() {
		let node = this._start
		for (;;) {
			const next = node.nextSibling
			yield node
			if (node === this._end) return
			assert(next, 'expected more siblings')
			node = next
		}
	}
	_extractContents() {
		this._marker = new Text()
		this._parentNode.insertBefore(this._marker, this._start)

		const fragment = document.createDocumentFragment()
		for (const node of this) fragment.appendChild(node)

		this._start = this._end = this._marker
		return fragment
	}
}

/* v8 ignore start */
if (DEV) {
	Span.prototype.toString = function () {
		let result = ''
		for (const node of this)
			result += isElement(node)
				? node.outerHTML
				: `${node.constructor.name}(${'data' in node ? JSON.stringify(node.data) : node})`
		return result
	}
}
/* v8 ignore stop */

class BoundTemplateInstance {
	/** @type {CompiledTemplate | undefined} */ #template
	/** @type {TemplateStringsArray} */ #statics

	get _template() {
		return (this.#template ??= compileTemplate(this.#statics))
	}

	constructor(statics, dynamics) {
		this.#statics = statics
		this._dynamics = dynamics

		// eagerly compile the template in DEV, plus some extra checks.
		DEV: assert(
			this._template._parts.length === dynamics.length,
			'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
		)
	}
}

/** @param {ParentNode} parent */
export function createRoot(parent) {
	const marker = new Text()
	parent.appendChild(marker)
	return new Root(new Span(marker))
}

/** @param {Node} node */
function insertRootAfter(node) {
	DEV: assert(node.parentNode, 'expected a parent node')
	const marker = new Text()
	node.parentNode.insertBefore(marker, node.nextSibling)
	return new Root(new Span(marker))
}

class Root {
	/** @type {Key | undefined} */ _key

	/** @param {Span} span */
	constructor(span) {
		this._span = span
	}

	render(value) {
		const t = value instanceof BoundTemplateInstance ? value : singlePartTemplate(value)

		if (this._instance?._template === t._template) {
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
		this._template = template
		const doc = /** @type {DocumentFragment} */ (template._content.cloneNode(true))

		const nodeByPart = []
		for (const node of doc.querySelectorAll('[data-dynparts]')) {
			const parts = node.getAttribute('data-dynparts')
			assert(parts)
			node.removeAttribute('data-dynparts')
			for (const part of parts.split(' ')) nodeByPart[part] = node
		}

		for (const part of template._rootParts) nodeByPart[part] = span

		// the fragment must be inserted before the parts are constructed,
		// because they need to know their final location.
		// this also ensures that custom elements are upgraded before we do things
		// to them, like setting properties or attributes.
		span._deleteContents()
		span._insertNode(doc)

		this._parts = template._parts.map(([dynamicIdx, createPart], elementIdx) => {
			const part = createPart(span)
			part.create(nodeByPart[elementIdx], dynamics[dynamicIdx])
			return /** @type {const} */ ([dynamicIdx, part])
		})
	}

	update(dynamics) {
		for (const [idx, part] of this._parts) part.update(dynamics[idx])
	}
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/gi
const FORCE_ATTRIBUTES = /-|^class$|^for$/i

/** @type {Map<TemplateStringsArray, CompiledTemplate>} */
const templates = new Map()
/** @param {TemplateStringsArray} statics */
function compileTemplate(statics) {
	const cached = templates.get(statics)
	if (cached) return cached

	const templateElement = document.createElement('template')
	templateElement.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}$`), '')

	let nextPart = 0
	/** @type {CompiledTemplate} */
	const compiled = {
		_content: templateElement.content,
		_parts: Array(statics.length - 1),
		_rootParts: [],
	}

	function patch(node, idx, createPart) {
		DEV: assert(nextPart < compiled._parts.length, 'got more parts than expected')
		if (isDocumentFragment(node)) compiled._rootParts.push(nextPart)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + nextPart
		else node.dataset.dynparts = nextPart
		compiled._parts[nextPart++] = [idx, createPart]
	}

	const walker = document.createTreeWalker(
		templateElement.content,
		NODE_FILTER_TEXT | NODE_FILTER_ELEMENT | (DEV ? NODE_FILTER_COMMENT : 0),
	)
	// stop iterating once we've hit the last part, but if we're in dev mode, keep going to check for mistakes.
	while ((nextPart < compiled._parts.length || DEV) && walker.nextNode()) {
		const node = /** @type {Text | Element | Comment} */ (walker.currentNode)
		if (isText(node)) {
			// reverse the order because we'll be supplying ChildPart with its index in the parent node.
			// and if we apply the parts forwards, indicies will be wrong if some prior part renders more than one node.
			// also reverse it because that's the correct order for splitting.
			const nodes = [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse().map(match => {
				node.splitText(match.index + match[0].length)
				const dyn = new Comment()
				node.splitText(match.index).replaceWith(dyn)
				return /** @type {const} */ ([dyn, parseInt(match[1])])
			})

			if (nodes.length) {
				DEV: assert(node.parentNode !== null, 'all text nodes should have a parent node')
				let siblings = [...node.parentNode.childNodes]
				for (const [node, idx] of nodes) {
					const child = siblings.indexOf(node)
					patch(node.parentNode, idx, span => new ChildPart(child, span))
				}
			}
		} else if (DEV && isComment(node)) {
			// just in dev, stub out a fake part for every interpolation in a comment.
			// this means you can comment out code inside a template and not run into
			// issues with incorrect part counts.
			// in production the check is skipped, so we can also skip this.
			for (const _match of node.data.matchAll(DYNAMIC_GLOBAL)) {
				compiled._parts[nextPart++] = [parseInt(_match[1]), () => ({ create() {}, update() {}, detach() {} })]
			}
		} else {
			assert(isElement(node))
			const toRemove = []
			for (let name of node.getAttributeNames()) {
				const value = node.getAttribute(name)
				assert(value !== null)

				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					// directive:
					toRemove.push(name)
					DEV: assert(value === '', `directives must not have values`)
					patch(node, parseInt(match[1]), () => new DirectivePart())
				} else {
					// properties:
					match = DYNAMIC_WHOLE.exec(value)
					if (match !== null) {
						toRemove.push(name)
						if (FORCE_ATTRIBUTES.test(name)) {
							patch(node, parseInt(match[1]), () => new AttributePart(name))
						} else {
							if (!(name in node)) {
								for (const property in node) {
									if (property.toLowerCase() === name) {
										name = property
										break
									}
								}
							}
							patch(node, parseInt(match[1]), () => new PropertyPart(name))
						}
					} else if (DEV) {
						assert(!DYNAMIC_GLOBAL.test(value), `expected a whole dynamic value for ${name}, got a partial one`)
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

/** @type {WeakMap<object, {
  _mounted: boolean 
	_invalidateQueued: Promise<void> | null
	_invalidate: () => void
	_unmountCallbacks: Set<Cleanup> | null
	_parentNode: Node
}>} */
const controllers = new WeakMap()

export function invalidate(renderable) {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return (controller._invalidateQueued ??= Promise.resolve().then(() => {
		controller._invalidateQueued = null
		controller._invalidate()
	}))
}

/** @type {WeakMap<Renderable, Set<() => Cleanup>>} */
const mountCallbacks = new WeakMap()

export function onMount(renderable, callback) {
	DEV: assert(isRenderable(renderable), 'expected a renderable')

	const controller = controllers.get(renderable)
	if (controller?._mounted) {
		;(controller._unmountCallbacks ??= new Set()).add(callback())
		return
	}

	let cb = mountCallbacks.get(renderable)
	if (!cb) mountCallbacks.set(renderable, (cb = new Set()))
	cb.add(callback)
}

export function onUnmount(renderable, callback) {
	onMount(renderable, () => callback)
}

export function getParentNode(renderable) {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return controller._parentNode
}

const keys = new WeakMap()
export function keyed(renderable, key) {
	if (DEV && keys.has(renderable)) throw new Error('renderable already has a key')
	keys.set(renderable, key)
	return renderable
}

/** @implements {Part} */
class ChildPart {
	#childIndex
	#parentSpan
	constructor(idx, span) {
		this.#childIndex = idx
		this.#parentSpan = span
	}

	/** @type {Span | undefined} */
	#span
	create(node, value) {
		if (node instanceof Span) {
			let child = node._start
			for (let i = 0; i < this.#childIndex; i++) {
				DEV: {
					assert(child.nextSibling !== null, 'expected more siblings')
					assert(child.nextSibling !== node._end, 'ran out of siblings before the end')
				}
				child = child.nextSibling
			}
			this.#span = new Span(child)
		} else {
			const child = node.childNodes[this.#childIndex]
			this.#span = new Span(child)
		}

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
			if (controller?._unmountCallbacks) for (const callback of controller._unmountCallbacks) callback?.()
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
		DEV: assert(this.#span)
		const endsWereEqual =
			this.#span._parentNode === this.#parentSpan.parentNode && this.#span._end === this.#parentSpan._end

		if (isRenderable(value)) {
			this.#switchRenderable(value)

			const renderable = value

			if (!controllers.has(renderable))
				controllers.set(renderable, {
					_mounted: false,
					_invalidateQueued: null,
					_invalidate: () => {
						DEV: assert(this.#renderable === renderable, 'could not invalidate an outdated renderable')
						this.update(renderable)
					},
					_unmountCallbacks: null, // will be upgraded to a Set if needed.
					_parentNode: this.#span._parentNode,
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
			let end = this.#span._start
			for (const item of value) {
				// @ts-expect-error -- WeakMap lookups of non-objects always return undefined, which is fine
				const key = keys.get(item) ?? item
				let root = (this.#roots[i] ??= insertRootAfter(end))

				if (key !== undefined && root._key !== key) {
					const j = this.#roots.findIndex(r => r._key === key)
					root._key = key
					if (j !== -1) {
						const root1 = root
						const root2 = this.#roots[j]

						// swap the contents of the spans
						const tmpContent = root1._span._extractContents()
						root1._span._insertNode(root2._span._extractContents())
						root2._span._insertNode(tmpContent)

						// swap the spans back
						const tmpSpan = root1._span
						root1._span = root2._span
						root2._span = tmpSpan

						// swap the roots
						this.#roots[j] = root1
						root = this.#roots[i] = root2
					}
				}

				root.render(item)
				end = root._span._end
				i++
			}

			// and now remove excess roots if the iterable has shrunk.
			while (this.#roots.length > i) {
				const root = this.#roots.pop()
				assert(root)
				root.detach()
				root._span._deleteContents()
			}

			this.#span._end = end

			const controller = controllers.get(this.#renderable)
			if (controller) {
				controller._mounted = true
				// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
				for (const callback of mountCallbacks.get(this.#renderable) ?? []) {
					;(controller._unmountCallbacks ??= new Set()).add(callback())
				}
				// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
				mountCallbacks.delete(this.#renderable)
			}

			if (endsWereEqual) this.#parentSpan._end = this.#span._end

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
				DEV: assert(this.#span._start === this.#span._end && this.#span._start instanceof Text)
				this.#span._start.data = '' + value
			} else {
				this.#span._deleteContents()
				if (value !== null) this.#span._insertNode(value instanceof Node ? value : new Text('' + value))
			}
		}

		this.#value = value

		const controller = controllers.get(this.#renderable)
		if (controller) {
			controller._mounted = true
			// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
			for (const callback of mountCallbacks.get(this.#renderable) ?? []) {
				;(controller._unmountCallbacks ??= new Set()).add(callback())
			}
			// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
			mountCallbacks.delete(this.#renderable)
		}

		if (endsWereEqual) this.#parentSpan._end = this.#span._end
	}

	detach() {
		this.#switchRenderable(null)
		this.#disconnectRoot()
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
		this.#node.setAttribute(this.#name, value)
	}

	detach() {
		this.#node.removeAttribute(this.#name)
	}
}

/** @implements {Part} */
class DirectivePart {
	#node
	/** @type {Cleanup} */
	#cleanup

	create(node, fn) {
		this.#node = node
		this.#cleanup = fn?.(this.#node)
	}

	update(fn) {
		this.#cleanup?.()
		this.#cleanup = fn?.(this.#node)
	}

	detach() {
		this.#cleanup?.()
		this.#cleanup = null
	}
}

/** @returns {Directive} */
export function attr(name, value) {
	return node => {
		if (typeof value === 'boolean') node.toggleAttribute(name, value)
		else if (value == null) node.removeAttribute(name)
		else node.setAttribute(name, value)
		return () => {
			node.removeAttribute(name)
		}
	}
}
