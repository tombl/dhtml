export function h(tag, props, ...children) {
	const el = document.createElement(tag)
	Object.assign(el, props)
	el.append(...children)
	return el
}

export function mock(inner) {
	function stub(...args) {
		const call = { this: this, args }
		stub.calls.push(call)
		try {
			return (call.result = inner.apply(this, args))
		} catch (error) {
			call.error = error
		}
	}
	stub.calls = []
	return stub
}

export function mockMember(obj, key, fn) {
	const original = obj[key]
	const mocked = (obj[key] = mock(fn ?? original))
	return {
		get calls() {
			return mocked.calls
		},
		reset() {
			obj[key] = original
		},
	}
}