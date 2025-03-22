import { controllers, keys, mountCallbacks } from './controller.ts'
import { isHtml, singlePartTemplate } from './html.ts'
import { assert } from './internal.ts'
import { createRoot, createRootAfter, type RootInternal } from './root.ts'
import { createSpan, spanDeleteContents, spanExtractContents, spanInsertNode, type Span } from './span.ts'
import { isIterable, isRenderable, type Cleanup, type Displayable, type Renderable } from './util.ts'

export interface Part {
	update(value: unknown): void
	detach(): void
}

export function createChildPart(parentNode: Node | Span, parentSpan: Span, childIndex: number): Part {
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

export function createPropertyPart(node: Node, name: string): Part {
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

export function createAttributePart(node: Element, name: string): Part {
	return {
		// @ts-expect-error -- setAttribute implicitly casts the value to a string
		update: value => node.setAttribute(name, value),
		detach: () => node.removeAttribute(name),
	}
}

export type Directive = (node: Element) => Cleanup

export function createDirectivePart(node: Node): Part {
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
