export type Coverage = import('puppeteer').Protocol.Profiler.ScriptCoverage

export function v8_to_lcov(coverage: Coverage[]): string {

}
