import { html_tag, type ToString } from './shared.ts'

export type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable> | HTML
export interface Renderable {
	render(): Displayable
}

export interface HTML {
	[html_tag]: true
	/* @internal */ _statics: TemplateStringsArray
	/* @internal */ _dynamics: unknown[]
}

export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML {
	return {
		[html_tag]: true,
		_dynamics: dynamics,
		_statics: statics,
	}
}
