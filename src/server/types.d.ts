/**
 * A function that renders a part of a template with the given values
 */
export type PartRenderer = (values: unknown[]) => string | Generator<string, void, void>

/**
 * A compiled template for server-side rendering
 */
export interface CompiledTemplate {
	statics: string[]
	parts: PartRenderer[]
	extra_parts: number
}
