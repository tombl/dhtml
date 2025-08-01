import { ATTR_NAME, DATA, assert, is_html, is_iterable, is_renderable, lex, single_part_template } from './shared.js'

//#region src/client/controller.ts
const controllers = /* @__PURE__ */ new WeakMap()
function get_controller(renderable) {
	let controller = controllers.get(renderable)
	if (!controller)
		controllers.set(
			renderable,
			(controller = {
				_mount_callbacks: [],
				_unmount_callbacks: [],
				_invalidate: /* @__PURE__ */ new Map(),
			}),
		)
	return controller
}
const keys = /* @__PURE__ */ new WeakMap()
function invalidate(renderable) {
	const controller = controllers.get(renderable)
	assert(controller, 'the renderable has not been rendered')
	controller._invalidate.forEach(invalidate$1 => invalidate$1())
}
function onMount(renderable, callback) {
	assert(is_renderable(renderable), 'expected a renderable')
	const controller = get_controller(renderable)
	if (controller._invalidate.size) controller._unmount_callbacks.push(callback())
	else controller._mount_callbacks.push(callback)
}
function onUnmount(renderable, callback) {
	onMount(renderable, () => callback)
}
function keyed(displayable, key) {
	assert(!keys.has(displayable), 'renderable already has a key')
	keys.set(displayable, key)
	return displayable
}
function get_key(displayable) {
	return keys.get(displayable) ?? displayable
}

//#endregion
//#region src/client/util.ts
function is_element(node) {
	return node.nodeType === 1
}
function is_comment(node) {
	return node.nodeType === 8
}
function is_document_fragment(node) {
	return node.nodeType === 11
}

//#endregion
//#region src/client/compiler.ts
const PART_CHILD = 0
const PART_DIRECTIVE = 1
const PART_ATTRIBUTE = 2
const PART_PROPERTY = 3
const DYNAMIC_WHOLE = /^dyn-\$(\d+)\$$/
const DYNAMIC_GLOBAL = /dyn-\$(\d+)\$/g
const FORCE_ATTRIBUTES = /-|^class$|^for$/i
const NEEDS_UPPERCASING = /\$./g
const templates = /* @__PURE__ */ new WeakMap()
function compile_template(statics) {
	const cached = templates.get(statics)
	if (cached) return cached
	const template_element = document.createElement('template')
	let next_part = 0
	template_element.innerHTML = [...lex(statics)]
		.map(([char, state]) => {
			if (char === '\0')
				if (state === DATA) return `<!--dyn-$${next_part++}$-->`
				else return `dyn-$${next_part++}$`
			if (state === ATTR_NAME && char.toLowerCase() !== char) return `$${char}`
			return char
		})
		.join('')
	next_part = 0
	const compiled = {
		_content: template_element.content,
		_parts: Array(statics.length - 1),
		_root_parts: [],
	}
	function patch(node, idx, data) {
		assert(next_part < compiled._parts.length, 'got more parts than expected')
		if (is_document_fragment(node)) compiled._root_parts.push(next_part)
		else if ('dynparts' in node.dataset) node.dataset.dynparts += ' ' + next_part
		else node.dataset.dynparts = next_part
		compiled._parts[next_part++] = [idx, data]
	}
	const walker = document.createTreeWalker(template_element.content, 129)
	assert((NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT) === 129)
	while (walker.nextNode()) {
		const node = walker.currentNode
		if (is_comment(node)) {
			const match = DYNAMIC_WHOLE.exec(node.data)
			if (match !== null) {
				const parent_node = node.parentNode
				assert(parent_node !== null, 'all text nodes should have a parent node')
				assert(
					parent_node instanceof DocumentFragment ||
						parent_node instanceof HTMLElement ||
						parent_node instanceof SVGElement,
				)
				parent_node.insertBefore(new Text(), node)
				parent_node.insertBefore(new Text(), node.nextSibling)
				patch(parent_node, parseInt(match[1]), [PART_CHILD, [...parent_node.childNodes].indexOf(node)])
			}
		} else {
			assert(is_element(node))
			assert(node instanceof HTMLElement || node instanceof SVGElement)
			for (const name of node.getAttributeNames()) {
				const value = node.getAttribute(name)
				assert(value !== null)
				let match = DYNAMIC_WHOLE.exec(name)
				if (match !== null) {
					node.removeAttribute(name)
					assert(value === '', `directives must not have values`)
					patch(node, parseInt(match[1]), [PART_DIRECTIVE])
				} else {
					match = DYNAMIC_WHOLE.exec(value)
					const remapped_name = name.replace(NEEDS_UPPERCASING, match$1 => match$1[1].toUpperCase())
					if (match !== null) {
						node.removeAttribute(name)
						if (FORCE_ATTRIBUTES.test(remapped_name)) patch(node, parseInt(match[1]), [PART_ATTRIBUTE, remapped_name])
						else patch(node, parseInt(match[1]), [PART_PROPERTY, remapped_name])
					} else if (remapped_name !== name) {
						assert(!node.hasAttribute(remapped_name), `duplicate attribute ${remapped_name}`)
						node.setAttribute(remapped_name, value)
						node.removeAttribute(name)
					} else
						assert(
							!DYNAMIC_GLOBAL.test(value),
							`expected a whole dynamic value for ${remapped_name}, got a partial one`,
						)
				}
			}
		}
	}
	compiled._parts.length = next_part
	templates.set(statics, compiled)
	return compiled
}

//#endregion
//#region src/client/span.ts
function create_span_into(parent) {
	const start = new Text()
	const end = new Text()
	parent.appendChild(start)
	parent.appendChild(end)
	return {
		_parent: parent,
		_start: start,
		_end: end,
	}
}
function create_span_after(node) {
	assert(node.parentNode !== null)
	const start = new Text()
	const end = new Text()
	node.parentNode.insertBefore(end, node.nextSibling)
	node.parentNode.insertBefore(start, end)
	return {
		_parent: node.parentNode,
		_start: start,
		_end: end,
	}
}
function insert_node(span, node) {
	span._parent.insertBefore(node, span._end)
}
function extract_contents(span) {
	const fragment = document.createDocumentFragment()
	let node = span._start.nextSibling
	for (;;) {
		assert(node)
		if (node === span._end) break
		const next = node.nextSibling
		fragment.appendChild(node)
		node = next
	}
	return fragment
}
function delete_contents(span) {
	let node = span._start.nextSibling
	for (;;) {
		assert(node)
		if (node === span._end) break
		const next = node.nextSibling
		span._parent.removeChild(node)
		node = next
	}
}

//#endregion
//#region src/client/parts.ts
function create_child_part(
	span,
	needs_revalidate = true,
	current_renderable,
	old_template,
	template_parts,
	entries,
	old_value,
) {
	function switch_renderable(next) {
		if (current_renderable && current_renderable !== next) {
			const controller = controllers.get(current_renderable)
			if (controller) {
				controller._invalidate.delete(switch_renderable)
				if (!controller._invalidate.size) {
					controller._unmount_callbacks.forEach(callback => callback?.())
					controller._unmount_callbacks.length = 0
				}
			}
		}
		current_renderable = next
	}
	function disconnect_root() {
		if (template_parts !== void 0) {
			for (const [, part] of template_parts) part(null)
			old_template = void 0
			template_parts = void 0
		}
	}
	return function update(value) {
		if (is_renderable(value)) {
			if (!needs_revalidate && value === current_renderable) return
			needs_revalidate = false
			switch_renderable(value)
			const renderable = value
			const controller = get_controller(renderable)
			if (!controller._invalidate.size)
				controller._unmount_callbacks = controller._mount_callbacks.map(callback => callback())
			controller._invalidate.set(switch_renderable, () => {
				assert(renderable === current_renderable)
				needs_revalidate = true
				update(renderable)
			})
			try {
				value = renderable.render()
			} catch (thrown) {
				if (is_html(thrown)) value = thrown
				else throw thrown
			}
			if (is_renderable(value)) value = single_part_template(value)
		} else switch_renderable(void 0)
		if (value === void 0) value = null
		if (is_iterable(value)) {
			if (!entries) {
				disconnect_root()
				delete_contents(span)
				entries = []
			}
			let i = 0
			let end = span._start
			for (const item of value) {
				const key = get_key(item)
				if (entries.length <= i) {
					const span$1 = create_span_after(end)
					entries[i] = {
						_span: span$1,
						_part: create_child_part(span$1),
						_key: key,
					}
				}
				if (key !== void 0 && entries[i]._key !== key) {
					for (let j = i + 1; j < entries.length; j++) {
						const entry1 = entries[i]
						const entry2 = entries[j]
						if (entry2._key === key) {
							const tmp_content = extract_contents(entry1._span)
							insert_node(entry1._span, extract_contents(entry2._span))
							insert_node(entry2._span, tmp_content)
							const tmp_span = { ...entry1._span }
							Object.assign(entry1._span, entry2._span)
							Object.assign(entry2._span, tmp_span)
							entries[j] = entry1
							entries[i] = entry2
							break
						}
					}
					entries[i]._key = key
				}
				entries[i]._part(item)
				end = entries[i]._span._end
				i++
			}
			while (entries.length > i) {
				const entry = entries.pop()
				assert(entry)
				entry._part(null)
			}
			old_value = void 0
			return
		} else if (entries) {
			for (const entry of entries) entry._part(null)
			entries = void 0
		}
		if (is_html(value)) {
			const { _dynamics: dynamics, _statics: statics } = value
			const template = compile_template(statics)
			assert(
				template._parts.length === dynamics.length,
				'expected the same number of dynamics as parts. do you have a ${...} in an unsupported place?',
			)
			if (old_template !== template) {
				if (template_parts !== void 0) {
					for (const [_idx, part] of template_parts) part(null)
					template_parts = void 0
				}
				old_template = template
				const doc = old_template._content.cloneNode(true)
				const node_by_part = []
				for (const node of doc.querySelectorAll('[data-dynparts]')) {
					const parts = node.getAttribute('data-dynparts')
					assert(parts)
					node.removeAttribute('data-dynparts')
					for (const part of parts.split(' ')) node_by_part[+part] = node
				}
				for (const part of old_template._root_parts) node_by_part[part] = span
				delete_contents(span)
				insert_node(span, doc)
				template_parts = template._parts.map(([dynamic_index, [type, data]], element_index) => {
					const node = node_by_part[element_index]
					switch (type) {
						case PART_CHILD:
							let child
							if (node instanceof Node) {
								child = node.childNodes[data]
								assert(child)
							} else {
								child = node._start.nextSibling
								assert(child)
								for (let i = 0; i < data; i++) {
									child = child.nextSibling
									assert(child !== null, 'expected more siblings')
									assert(child !== node._end, 'ran out of siblings before the end')
								}
							}
							assert(child.parentNode && child.previousSibling && child.nextSibling)
							return [
								dynamic_index,
								create_child_part({
									_parent: child.parentNode,
									_start: child.previousSibling,
									_end: child.nextSibling,
								}),
							]
						case PART_DIRECTIVE:
							assert(node instanceof Node)
							return [dynamic_index, create_directive_part(node)]
						case PART_ATTRIBUTE:
							assert(node instanceof Element)
							return [dynamic_index, create_attribute_part(node, data)]
						case PART_PROPERTY:
							assert(node instanceof Node)
							return [dynamic_index, create_property_part(node, data)]
					}
				})
			}
			assert(template_parts)
			for (const [idx, part] of template_parts) part(dynamics[idx])
			old_value = void 0
			return
		}
		if (!Object.is(old_value, value)) {
			disconnect_root()
			if (old_value != null && value !== null && !(old_value instanceof Node) && !(value instanceof Node)) {
				assert(span._start.nextSibling?.nextSibling === span._end && span._start.nextSibling instanceof Text)
				span._start.nextSibling.data = '' + value
			} else {
				delete_contents(span)
				if (value !== null) insert_node(span, value instanceof Node ? value : new Text('' + value))
			}
			old_value = value
		}
	}
}
function create_property_part(node, name) {
	return value => {
		node[name] = value
	}
}
function create_attribute_part(node, name) {
	return value => set_attr(node, name, value)
}
function create_directive_part(node) {
	let cleanup
	return fn => {
		assert(typeof fn === 'function' || fn == null)
		cleanup?.()
		cleanup = fn?.(node)
	}
}
function set_attr(el, name, value) {
	if (typeof value === 'boolean') el.toggleAttribute(name, value)
	else if (value == null) el.removeAttribute(name)
	else el.setAttribute(name, value)
}
function attr_directive(name, value) {
	return el => {
		set_attr(el, name, value)
		return () => set_attr(el, name, null)
	}
}
function on_directive(type, listener, options) {
	return el => {
		el.addEventListener(type, listener, options)
		return () => el.removeEventListener(type, listener, options)
	}
}

//#endregion
//#region src/client/root.ts
function createRoot(parent) {
	const span = create_span_into(parent)
	return { render: create_child_part(span) }
}
function find_end(start) {
	assert(start.data === '?[')
	let depth = 1
	let node = start
	while ((node = node.nextSibling))
		if (is_comment(node)) {
			if (node.data === '?[') depth++
			else if (node.data === '?]') {
				depth--
				if (depth === 0) return node
			}
		}
	return null
}
function hydrate(parent, value) {
	let start
	for (start of parent.childNodes) if (is_comment(start) && start.data === '?[') break
	assert(
		start && is_comment(start),
		`Could not find hydration start comment. Please ensure the element contains server-side rendered output.`,
	)
	const end = find_end(start)
	assert(end, `Could not find hydration end comment. Please ensure the element contains server-side rendered output.`)
	const render = hydrate_child_part(
		{
			_parent: parent,
			_start: start,
			_end: end,
		},
		value,
	)
	render(value)
	return { render }
}
function hydrate_child_part(span, value) {
	let current_renderable
	let template
	let template_parts
	let entries
	if (is_renderable(value)) {
		try {
			value = (current_renderable = value).render()
		} catch (thrown) {
			if (is_html(thrown)) value = thrown
			else throw thrown
		}
		if (is_renderable(value)) value = single_part_template(value)
	}
	if (is_iterable(value)) {
		entries = []
		const { _parent } = span
		let end = span._start
		for (const item of value) {
			const key = get_key(item)
			const start = end.nextSibling
			assert(start && is_comment(start) && start.data === '?[')
			end = find_end(start)
			assert(end)
			const span$1 = {
				_parent,
				_start: start,
				_end: end,
			}
			entries.push({
				_span: span$1,
				_part: hydrate_child_part(span$1, item),
				_key: key,
			})
		}
		assert(end.nextSibling === span._end)
	}
	if (is_html(value)) {
		template = compile_template(value._statics)
		const node_by_part = []
		const walker = document.createTreeWalker(span._parent, 129)
		const template_walker = document.createTreeWalker(template._content, 129)
		assert((NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT) === 129)
		walker.currentNode = span._start
		while (walker.nextNode() && template_walker.nextNode()) {
			const node = walker.currentNode
			const template_node = template_walker.currentNode
			if (node === span._end) break
			if (is_comment(node) && is_comment(template_node)) {
				if (node.data === '?[') {
					assert(DYNAMIC_WHOLE.test(template_node.data))
					const end = find_end(node)
					assert(end)
					walker.currentNode = end
				}
				continue
			}
			assert(is_element(node))
			assert(
				node.nodeType === template_node.nodeType,
				`Node type mismatch: ${node.nodeType} != ${template_node.nodeType}`,
			)
			assert(template_node instanceof HTMLElement || template_node instanceof SVGElement)
			assert(node.tagName === template_node.tagName, `Tag name mismatch: ${node.tagName} !== ${template_node.tagName}`)
			if (template_node.dataset.dynparts)
				for (const part of template_node.dataset.dynparts.split(' ')) node_by_part[+part] = node
		}
		for (const part of template._root_parts) node_by_part[part] = span
		template_parts = template._parts.map(([dynamic_index, [type, data]], element_index) => {
			const node = node_by_part[element_index]
			switch (type) {
				case PART_CHILD:
					let child
					if (node instanceof Node) {
						child = node.childNodes[data]
						assert(child)
					} else {
						child = node._start.nextSibling
						assert(child)
						for (let i = 0; i < data; i++) {
							child = child.nextSibling
							assert(child !== null, 'expected more siblings')
							assert(child !== node._end, 'ran out of siblings before the end')
						}
					}
					assert(child.parentNode)
					assert(child.previousSibling && is_comment(child.previousSibling) && child.previousSibling.data === '?[')
					const end = find_end(child.previousSibling)
					assert(end)
					return [
						dynamic_index,
						hydrate_child_part(
							{
								_parent: child.parentNode,
								_start: child.previousSibling,
								_end: end,
							},
							value._dynamics[dynamic_index],
						),
					]
				case PART_DIRECTIVE:
					assert(node instanceof Node)
					return [dynamic_index, create_directive_part(node)]
				case PART_ATTRIBUTE:
					assert(node instanceof Element)
					return [dynamic_index, create_attribute_part(node, data)]
				case PART_PROPERTY:
					assert(node instanceof Node)
					return [dynamic_index, create_property_part(node, data)]
			}
		})
	}
	return create_child_part(span, true, current_renderable, template, template_parts, entries, value)
}

//#endregion
export { attr_directive as attr, createRoot, hydrate, invalidate, keyed, on_directive as on, onMount, onUnmount }
//# sourceMappingURL=client.js.map
