function makeFavicon(emoji) {
	const link = document.createElement('link')
	link.rel = 'icon'
	link.href = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <text x='50' y='80' font-size='90' text-anchor='middle'>${emoji}</text>
    </svg>
  `)}`
	return link
}

const favicon = makeFavicon('🟡')
document.head.appendChild(favicon)

export function pass() {
	if (parent === window) {
		favicon.replaceWith(makeFavicon('✅'))
		console.info('✅')
	} else {
		parent.postMessage({ status: 'pass' }, '*')
	}
}

export function fail(reason) {
	if (parent === window) {
		favicon.replaceWith(makeFavicon('❌'))
		console.error('❌', reason)
	} else {
		parent.postMessage({ status: 'fail', reason }, '*')
	}
}

export function test(fn) {
	try {
		fn()
		pass()
	} catch (e) {
		fail(e)
	}
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
