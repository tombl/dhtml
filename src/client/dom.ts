function method<T extends { [_ in K]: (...args: any[]) => any }, K extends keyof T>(self: T, key: K) {
	const fn = self[key]
	return fn.call.bind(fn) as (self: T, ...args: Parameters<T[K]>) => ReturnType<T[K]>
}

function getter<T extends { [_ in K]: any }, K extends keyof T>(self: T, key: K) {
	const get = Object.getOwnPropertyDescriptor(self, key)!.get!
	return get.call.bind(get) as (self: T) => T[K]
}

/** @internal */ export const insert_before = method(Node.prototype, 'insertBefore')
/** @internal */ export const remove_child = method(Node.prototype, 'removeChild')
/** @internal */ export const append_child = method(Node.prototype, 'appendChild')

/** @internal */ export const get_attribute_names = method(Element.prototype, 'getAttributeNames')
/** @internal */ export const get_attribute = method(Element.prototype, 'getAttribute')
/** @internal */ export const set_attribute = method(Element.prototype, 'setAttribute')
/** @internal */ export const remove_attribute = method(Element.prototype, 'removeAttribute')

/** @internal */ export const get_next_sibling = getter(Node.prototype, 'nextSibling')
/** @internal */ export const get_child_nodes = getter(Node.prototype, 'childNodes')
/** @internal */ export const get_node_type = getter(Node.prototype, 'nodeType')
