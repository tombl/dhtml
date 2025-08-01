import { Displayable, Renderable } from './index2.js'

//#region src/client/util.d.ts
type Cleanup = (() => void) | void | undefined | null
//#endregion
//#region src/client/controller.d.ts
type Key = string | number | bigint | boolean | symbol | object | null
declare function invalidate(renderable: Renderable): void
declare function onMount(renderable: Renderable, callback: () => Cleanup): void
declare function onUnmount(renderable: Renderable, callback: () => void): void
declare function keyed<T extends Displayable & object>(displayable: T, key: Key): T
//#endregion
//#region src/client/parts.d.ts
type Directive = (el: Element) => Cleanup
declare function attr_directive(name: string, value: string | boolean | null | undefined): Directive
declare function on_directive(
	type: string,
	listener: EventListenerOrEventListenerObject,
	options?: boolean | AddEventListenerOptions,
): Directive
//#endregion
//#region src/client/root.d.ts
interface Root {
	render(value: Displayable): void
}
declare function createRoot(parent: Node): Root
declare function hydrate(parent: Node, value: Displayable): Root
//#endregion
export {
	attr_directive as attr,
	createRoot,
	hydrate,
	invalidate,
	keyed,
	on_directive as on,
	onMount,
	onUnmount,
	type Directive,
	type Root,
}
//# sourceMappingURL=client.d.ts.map
