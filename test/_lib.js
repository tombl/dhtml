export function h(tag, props, ...children) {
	const el = document.createElement(tag)
	Object.assign(el, props)
	el.append(...children)
	return el
}

export function assert(condition, message = 'Assertion failed') {
	if (!condition) throw new Error(message)
}

assert.eq = (actual, expected) => {
	if (actual === expected) return
	if (typeof actual !== 'string') actual = JSON.stringify(actual, null, 2)
	if (typeof expected !== 'string') expected = JSON.stringify(expected, null, 2)
	throw new Error(
		[
			'Expected:',
			...expected.split('\n').map(line => '  ' + line),
			'Actual:',
			...actual.split('\n').map(line => '  ' + line),
		].join('\n'),
	)
}

assert.deepEq = (actual, expected) => assert.eq(JSON.stringify(actual, null, 2), JSON.stringify(expected, null, 2))
