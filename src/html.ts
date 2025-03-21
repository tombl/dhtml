declare global {
	const DHTML_PROD: unknown
}

interface ToString {
	toString(): string
}

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable>
export interface Renderable {
	render(): Displayable
}

type Cleanup = (() => void) | void | undefined | null
export type Directive = (node: Element) => Cleanup

interface CompiledTemplate {
	_content: DocumentFragment
	_parts: [idx: number, createPart: (node: Node | Span, span: Span) => Part][]
	_rootParts: number[]
}

const DEV = typeof DHTML_PROD === 'undefined' || !DHTML_PROD

const NODE_FILTER_ELEMENT: typeof NodeFilter.SHOW_ELEMENT = 1
const NODE_FILTER_TEXT: typeof NodeFilter.SHOW_TEXT = 4
const NODE_FILTER_COMMENT: typeof NodeFilter.SHOW_COMMENT = 128

const isElement = (node: Node): node is Element => node.nodeType === (1 satisfies typeof Node.ELEMENT_NODE)

const isText = (node: Node): node is Text => node.nodeType === (3 satisfies typeof Node.TEXT_NODE)

const isComment = (node: Node): node is Comment => node.nodeType === (8 satisfies typeof Node.COMMENT_NODE)

const isDocumentFragment = (node: Node): node is DocumentFragment =>
	node.nodeType === (11 satisfies typeof Node.DOCUMENT_FRAGMENT_NODE)

const isRenderable = (value: unknown): value is Renderable =>
	typeof value === 'object' && value !== null && 'render' in value

const isIterable = (value: unknown): value is Iterable<unknown> =>
	typeof value === 'object' && value !== null && Symbol.iterator in value

const isHtml = (value: any): value is ReturnType<typeof html> => value?.$ === html

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]) {
	let template: CompiledTemplate

	if (DEV) {
		assert(
			compileTemplate(statics)._parts.length === dynamics.length,
			'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
		)
	}

	return {
		$: html,
		_dynamics: dynamics,
		get _template() {
			return (template ??= compileTemplate(statics))
		},
	}
}

const singlePartTemplate = (part: Displayable) => html`${part}`

/* v8 ignore start */

function assert(value: unknown, message?: string): asserts value {
	if (!DEV) return
	if (!value) throw new Error(message ?? 'assertion failed')
}
/* v8 ignore stop */

interface Span {
	_parentNode: Node
	_start: Node
	_end: Node
	_marker: Node | null
}

function createSpan(node: Node): Span {
	DEV: assert(node.parentNode !== null)
	return {
		_parentNode: node.parentNode,
		_start: node,
		_end: node,
		_marker: null,
	}
}

function spanInsertNode(span: Span, node: Node) {
	const end = isDocumentFragment(node) ? node.lastChild : node
	if (end === null) return // empty fragment
	span._parentNode.insertBefore(node, span._end.nextSibling)
	span._end = end

	if (span._start === span._marker) {
		DEV: assert(span._start.nextSibling)
		span._start = span._start.nextSibling

		span._parentNode.removeChild(span._marker)
		span._marker = null
	}
}

function* spanIterator(span: Span) {
	let node = span._start
	for (;;) {
		const next = node.nextSibling
		yield node
		if (node === span._end) return
		assert(next, 'expected more siblings')
		node = next
	}
}

function spanExtractContents(span: Span) {
	span._marker = new Text()
	span._parentNode.insertBefore(span._marker, span._start)

	const fragment = document.createDocumentFragment()
	for (const node of spanIterator(span)) fragment.appendChild(node)

	span._start = span._end = span._marker
	return fragment
}

function spanDeleteContents(span: Span) {
	span._marker = new Text()
	span._parentNode.insertBefore(span._marker, span._start)

	for (const node of spanIterator(span)) span._parentNode.removeChild(node)

	span._start = span._end = span._marker
}

interface Root {
	render(value: Displayable): void
	detach(): void
}
interface RootInternal extends Root {
	_span: Span
	_key: Key | undefined
}

export type { Root }
export { createRootInto as createRoot }

function createRootInto(parent: Node): Root {
	const marker = new Text()
	parent.appendChild(marker)
	return createRoot(createSpan(marker))
}

function createRootAfter(node: Node) {
	DEV: assert(node.parentNode, 'expected a parent node')
	const marker = new Text()
	node.parentNode.insertBefore(marker, node.nextSibling)
	return createRoot(createSpan(marker))
}

function createRoot(span: Span): RootInternal {
	let template: CompiledTemplate
	let parts: [number, Part][] | undefined

	function detach() {
		if (!parts) return
		// scan through all the parts of the previous tree, and clear any renderables.
		for (const [_idx, part] of parts) part.detach()
		parts = undefined
	}

	return {
		_span: span,
		_key: undefined,

		render: (value: Displayable) => {
			const html = isHtml(value) ? value : singlePartTemplate(value)

			if (template !== html._template) {
				detach()

				template = html._template

				const doc = template._content.cloneNode(true) as DocumentFragment

				const nodeByPart: Array<Node | Span> = []

				for (const node of doc.querySelectorAll('[data-dynparts]')) {
					const parts = node.getAttribute('data-dynparts')
					assert(parts)
					node.removeAttribute('data-dynparts')
					// @ts-expect-error -- is part a number, is part a string, who cares?
					for (const part of parts.split(' ')) nodeByPart[part] = node
				}

				for (const part of template._rootParts) nodeByPart[part] = span

				// the fragment must be inserted before the parts are constructed,
				// because they need to know their final location.
				// this also ensures that custom elements are upgraded before we do things
				// to them, like setting properties or attributes.
				spanDeleteContents(span)
				spanInsertNode(span, doc)

				parts = html._template._parts.map(([dynamicIdx, createPart], elementIdx) => [
					dynamicIdx,
					createPart(nodeByPart[elementIdx], span),
				])
			}

			assert(parts)
			for (const [idx, part] of parts) part.update(html._dynamics[idx])
		},

		detach,
	}
}

const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/i
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/gi
const FORCE_ATTRIBUTES = /-|^class$|^for$/i

const templates: Map<TemplateStringsArray, CompiledTemplate> = new Map()
function compileTemplate(statics: TemplateStringsArray) {
	const cached = templates.get(statics)
	if (cached) return cached

	const templateElement = document.createElement('template')
	templateElement.innerHTML = statics.reduce((a, v, i) => a + v + (i === statics.length - 1 ? '' : `dyn-$${i}$`), '')

	let nextPart = 0

	const compiled: CompiledTemplate = {
		_content: templateElement.content,
		_parts: Array(statics.length - 1),
		_rootParts: [],
	}

	function patch(
		node: DocumentFragment | HTMLElement | SVGElement,
		idx: number,
		createPart: (node: Node | Span, span: Span) => Part,
	) {
		DEV: assert(nextPart < compiled._parts.length, 'got more parts than expected')
		if (isDocumentFragment(node)) compiled._rootParts.push(nextPart)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + nextPart
		// @ts-expect-error -- this assigment will cast nextPart to a string
		else node.dataset.dynparts = nextPart
		compiled._parts[nextPart++] = [idx, createPart]
	}

	const walker = document.createTreeWalker(
		templateElement.content,
		NODE_FILTER_TEXT | NODE_FILTER_ELEMENT | (DEV ? NODE_FILTER_COMMENT : 0),
	)
	// stop iterating once we've hit the last part, but if we're in dev mode, keep going to check for mistakes.
	while ((nextPart < compiled._parts.length || DEV) && walker.nextNode()) {
		const node = walker.currentNode
		if (isText(node)) {
			// reverse the order because we'll be supplying ChildPart with its index in the parent node.
			// and if we apply the parts forwards, indicies will be wrong if some prior part renders more than one node.
			// also reverse it because that's the correct order for splitting.
			const nodes = [...node.data.matchAll(DYNAMIC_GLOBAL)].reverse().map(match => {
				node.splitText(match.index + match[0].length)
				const dyn = new Comment()
				node.splitText(match.index).replaceWith(dyn)
				return [dyn, parseInt(match[1])] as const
			})

			if (nodes.length) {
				const parentNode = node.parentNode
				DEV: assert(parentNode !== null, 'all text nodes should have a parent node')
				DEV: assert(
					parentNode instanceof DocumentFragment ||
						parentNode instanceof HTMLElement ||
						parentNode instanceof SVGElement,
				)
				let siblings = [...parentNode.childNodes]
				for (const [node, idx] of nodes) {
					const child = siblings.indexOf(node)
					patch(parentNode, idx, (node, span) => createChildPart(node, span, child))
				}
			}
		} else if (DEV && isComment(node)) {
			// just in dev, stub out a fake part for every interpolation in a comment.
			// this means you can comment out code inside a template and not run into
			// issues with incorrect part counts.
			// in production the check is skipped, so we can also skip this.
			for (const _match of node.data.matchAll(DYNAMIC_GLOBAL)) {
				compiled._parts[nextPart++] = [parseInt(_match[1]), () => ({ update() {}, detach() {} })]
			}
		} else {
			assert(isElement(node))
			DEV: assert(node instanceof HTMLElement || node instanceof SVGElement)

			const toRemove = []
			for (let name of node.getAttributeNames()) {
				const value = node.getAttribute(name)
				assert(value !== null)

				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					// directive:
					toRemove.push(name)
					DEV: assert(value === '', `directives must not have values`)
					patch(node, parseInt(match[1]), node => {
						DEV: assert(node instanceof Node)
						return createDirectivePart(node)
					})
				} else {
					// properties:
					match = DYNAMIC_WHOLE.exec(value)
					if (match !== null) {
						toRemove.push(name)
						if (FORCE_ATTRIBUTES.test(name)) {
							patch(node, parseInt(match[1]), node => {
								DEV: assert(node instanceof Element)
								return createAttributePart(node, name)
							})
						} else {
							if (!(name in node)) {
								for (const property in node) {
									if (property.toLowerCase() === name) {
										name = property
										break
									}
								}
							}
							patch(node, parseInt(match[1]), node => {
								DEV: assert(node instanceof Node)
								return createPropertyPart(node, name)
							})
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

const controllers = new WeakMap<
	object,
	{
		_mounted: boolean
		_invalidateQueued: Promise<void> | null
		_invalidate: () => void
		_unmountCallbacks: Set<Cleanup> | null
		_parentNode: Node
	}
>()

export function invalidate(renderable: Renderable): Promise<void> {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return (controller._invalidateQueued ??= Promise.resolve().then(() => {
		controller._invalidateQueued = null
		controller._invalidate()
	}))
}

const mountCallbacks = new WeakMap<Renderable, Set<() => Cleanup>>()

export function onMount(renderable: Renderable, callback: () => Cleanup) {
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

export function onUnmount(renderable: Renderable, callback: () => void) {
	onMount(renderable, () => callback)
}

export function getParentNode(renderable: Renderable) {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	return controller._parentNode
}

type Key = string | number | bigint | boolean | symbol | object | null

const keys = new WeakMap<Displayable & object, Key>()

export function keyed<T extends Displayable & object>(renderable: T, key: Key): T {
	if (DEV && keys.has(renderable)) throw new Error('renderable already has a key')
	keys.set(renderable, key)
	return renderable
}

interface Part {
	update(value: unknown): void
	detach(): void
}

function createChildPart(parentNode: Node | Span, parentSpan: Span, childIndex: number): Part {
	let span

	// for when we're rendering a renderable:
	let renderable: Renderable | null = null

	// for when we're rendering a template:
	let root: RootInternal | undefined

	// for when we're rendering multiple values:
	let roots: RootInternal[] | undefined

	// for when we're rendering a string/single dom node:
	// undefined means no previous value, because a user-specified undefined is remapped to null

	let prevValue: Displayable | null | undefined

	function switchRenderable(next: Renderable | null) {
		if (renderable && renderable !== next) {
			const controller = controllers.get(renderable)
			if (controller?._unmountCallbacks) for (const callback of controller._unmountCallbacks) callback?.()
			controllers.delete(renderable)
		}
		renderable = next
	}

	function disconnectRoot() {
		// root.detach and part.detach are mutually recursive, so this detaches children too.
		root?.detach()
		root = undefined
	}

	if (parentNode instanceof Node) {
		const child = parentNode.childNodes[childIndex]
		span = createSpan(child)
	} else {
		let child = parentNode._start
		for (let i = 0; i < childIndex; i++) {
			DEV: {
				assert(child.nextSibling !== null, 'expected more siblings')
				assert(child.nextSibling !== parentNode._end, 'ran out of siblings before the end')
			}
			child = child.nextSibling
		}
		span = createSpan(child)
	}

	return {
		update: function update(value: Displayable) {
			DEV: assert(span)
			const endsWereEqual = span._parentNode === parentSpan._parentNode && span._end === parentSpan._end

			if (isRenderable(value)) {
				switchRenderable(value)

				const renderable = value

				if (!controllers.has(renderable))
					controllers.set(renderable, {
						_mounted: false,
						_invalidateQueued: null,
						_invalidate: () => {
							DEV: assert(renderable === renderable, 'could not invalidate an outdated renderable')
							update(renderable)
						},
						_unmountCallbacks: null, // will be upgraded to a Set if needed.
						_parentNode: span._parentNode,
					})

				try {
					value = renderable.render()
				} catch (thrown) {
					if (isHtml(thrown)) {
						value = thrown
					} else {
						throw thrown
					}
				}

				// if render returned another renderable, we want to track/cache both renderables individually.
				// wrap it in a nested ChildPart so that each can be tracked without ChildPart having to handle multiple renderables.
				if (isRenderable(value)) value = singlePartTemplate(value)
			} else switchRenderable(null)

			// if it's undefined, swap the value for null.
			// this means if the initial value is undefined,
			// it won't conflict with prevValue's default of undefined,
			// so it'll still render.
			if (value === undefined) value = null

			// NOTE: we're explicitly not caching/diffing the value when it's an iterable,
			// given it can yield different values but have the same identity. (e.g. arrays)
			if (isIterable(value)) {
				if (!roots) {
					// we previously rendered a single value, so we need to clear it.
					disconnectRoot()
					spanDeleteContents(span)

					roots = []
				}

				// create or update a root for every item.
				let i = 0
				let end = span._start
				for (const item of value) {
					// @ts-expect-error -- WeakMap lookups of non-objects always return undefined, which is fine
					const key = keys.get(item) ?? item
					let root = (roots[i] ??= createRootAfter(end))

					if (key !== undefined && root._key !== key) {
						const j = roots.findIndex(r => r._key === key)
						root._key = key
						if (j !== -1) {
							const root1 = root
							const root2 = roots[j]

							// swap the contents of the spans
							const tmpContent = spanExtractContents(root1._span)
							spanInsertNode(root1._span, spanExtractContents(root2._span))
							spanInsertNode(root2._span, tmpContent)

							// swap the spans back
							const tmpSpan = root1._span
							root1._span = root2._span
							root2._span = tmpSpan

							// swap the roots
							roots[j] = root1
							root = roots[i] = root2
						}
					}

					root.render(item as Displayable)
					end = root._span._end
					i++
				}

				// and now remove excess roots if the iterable has shrunk.
				while (roots.length > i) {
					const root = roots.pop()
					assert(root)
					root.detach()
					spanDeleteContents(root._span)
				}

				span._end = end

				// @ts-expect-error -- a null controllable will always return a null controller
				const controller = controllers.get(renderable)
				if (controller) {
					controller._mounted = true
					// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
					for (const callback of mountCallbacks.get(renderable) ?? []) {
						;(controller._unmountCallbacks ??= new Set()).add(callback())
					}
					// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
					mountCallbacks.delete(renderable)
				}

				if (endsWereEqual) parentSpan._end = span._end

				return
			} else if (roots) {
				for (const root of roots) root.detach()
				roots = undefined
			}

			// now early return if the value hasn't changed.
			if (Object.is(prevValue, value)) return

			if (isHtml(value)) {
				root ??= createRoot(span)
				root.render(value) // root.render will detach the previous tree if the template has changed.
			} else {
				// if we previously rendered a tree that might contain renderables,
				// and the template has changed (or we're not even rendering a template anymore),
				// we need to clear the old renderables.
				disconnectRoot()

				if (prevValue != null && value !== null && !(prevValue instanceof Node) && !(value instanceof Node)) {
					// we previously rendered a string, and we're rendering a string again.
					DEV: assert(span._start === span._end && span._start instanceof Text)
					span._start.data = '' + value
				} else {
					spanDeleteContents(span)
					if (value !== null) spanInsertNode(span, value instanceof Node ? value : new Text('' + value))
				}
			}

			prevValue = value

			// @ts-expect-error -- a null controllable will always return a null controller
			const controller = controllers.get(renderable)
			if (controller) {
				controller._mounted = true
				// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
				for (const callback of mountCallbacks.get(renderable) ?? []) {
					;(controller._unmountCallbacks ??= new Set()).add(callback())
				}
				// @ts-expect-error -- WeakMap lookups of null always return undefined, which is fine
				mountCallbacks.delete(renderable)
			}

			if (endsWereEqual) parentSpan._end = span._end
		},
		detach: () => {
			switchRenderable(null)
			disconnectRoot()
		},
	}
}

function createPropertyPart(node: Node, name: string): Part {
	return {
		update: value => {
			// @ts-expect-error
			node[name] = value
		},
		detach: () => {
			// @ts-expect-error
			delete node[name]
		},
	}
}

function createAttributePart(node: Element, name: string): Part {
	return {
		// @ts-expect-error -- setAttribute implicitly casts the value to a string
		update: value => node.setAttribute(name, value),
		detach: () => node.removeAttribute(name),
	}
}

function createDirectivePart(node: Node): Part {
	let cleanup: Cleanup
	return {
		update: fn => {
			DEV: assert(typeof fn === 'function' || fn == null)
			cleanup?.()
			cleanup = fn?.(node)
		},

		detach: () => {
			cleanup?.()
			cleanup = null
		},
	}
}

export function attr(name: string, value: string | boolean | null | undefined): Directive {
	return node => {
		if (typeof value === 'boolean') node.toggleAttribute(name, value)
		else if (value == null) node.removeAttribute(name)
		else node.setAttribute(name, value)
		return () => {
			node.removeAttribute(name)
		}
	}
}
