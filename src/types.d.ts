import type { html_tag } from './shared.js'

export type Cleanup = (() => void) | void

declare global {
	var __DEV__: boolean
}

declare module 'dhtml' {
	export * from './index.js'

	interface ToString {
		toString(): string
	}

	export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable> | HTML

	export interface Renderable {
		render(): Displayable
	}

	export interface HTML {
		[html_tag]: true
		/** @internal */
		_statics: TemplateStringsArray
		/** @internal */
		_dynamics: unknown[]
	}
}

declare module 'dhtml/client' {
	import { Displayable } from 'dhtml'

	export * from './client.js'

	export type Directive = (node: Element) => Cleanup

	export interface Root {
		render(value: Displayable): void
		detach(): void
	}
}

declare module 'dhtml/server' {
	export * from './server.js'
}
