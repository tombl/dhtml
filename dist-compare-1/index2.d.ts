//#region src/shared.d.ts

interface ToString {
	toString(): string
}
type Displayable = null | undefined | ToString | Node | Renderable | Iterable<Displayable> | HTML
interface Renderable {
	render(): Displayable
}
declare const html_tag: unique symbol
//#endregion
//#region src/index.d.ts
interface HTML {
	[html_tag]: true
}
declare function html(statics: TemplateStringsArray, ...dynamics: unknown[]): HTML
//#endregion
export { HTML, html, type Displayable, type Renderable }
//# sourceMappingURL=index2.d.ts.map
