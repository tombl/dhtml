import { tests } from './runtime.ts'

export function test(name: string, fn: () => void | Promise<void>): void {
	tests.push({ name, fn })
}

export { bench } from 'mitata'

export function assert(value: unknown, message?: string): asserts value {
	if (!value) throw new Error(message ?? 'assertion failed')
}

export function assert_eq<T>(actual: T, expected: T, message?: string): asserts actual {
	if (actual !== expected) throw new Error(message ?? `Expected ${expected} but got ${actual}`)
}

export function assert_deep_eq<T>(actual: T, expected: T, message?: string): asserts actual {
	if (!deep_eq(actual, expected)) {
		throw new Error(
			message ?? `Expected ${JSON.stringify(expected, null, 2)} but got ${JSON.stringify(actual, null, 2)}`,
		)
	}
}

function deep_eq(a: any, b: any): boolean {
	if (a === b) return true
	if (Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)) return false
	if (!(typeof a === 'object' || typeof b === 'object')) return false
	const a_keys = Object.keys(a)
	const b_keys = new Set(Object.keys(b))
	if (a_keys.length !== b_keys.size) return false
	for (const key of a_keys) {
		if (!b_keys.has(key) || !deep_eq(a[key], b[key])) return false
	}
	return true
}
