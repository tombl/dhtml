declare global {
	const DHTML_PROD: unknown
}

export const DEV: boolean = typeof DHTML_PROD === 'undefined' || !DHTML_PROD

/* v8 ignore start */
export function assert(value: unknown, message?: string): asserts value {
	if (!DEV) return
	if (!value) throw new Error(message ?? 'assertion failed')
}
/* v8 ignore stop */
