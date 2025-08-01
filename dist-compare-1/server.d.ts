import { Displayable } from './index2.js'

//#region src/server.d.ts
declare function renderToString(value: Displayable): string
declare function renderToReadableStream(value: Displayable): ReadableStream<Uint8Array>
//#endregion
export { renderToReadableStream, renderToString }
//# sourceMappingURL=server.d.ts.map
