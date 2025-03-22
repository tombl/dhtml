interface ToString {
	toString(): string
}

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable>
export interface Renderable {
	render(): Displayable
}

declare const DHTML_DEV: boolean
export const DEV: boolean = DHTML_DEV

/* v8 ignore start */
export function assert(value: unknown, message?: string): asserts value {
	if (!DEV) return
	if (!value) throw new Error(message ?? 'assertion failed')
}
/* v8 ignore stop */
