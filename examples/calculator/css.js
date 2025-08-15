const class_names = new WeakMap()
const adopted = new WeakSet()
const stylesheet = new CSSStyleSheet()
let next_id = 0
const cache = new Map()

/**
 * @param {TemplateStringsArray} strings
 * @param {unknown[]} dynamics
 * @returns {import('dhtml/client').Directive}
 */
export function css(strings, ...dynamics) {
	let class_name = class_names.get(strings)
	if (!class_name) {
		class_names.set(strings, (class_name = `gen-${next_id++}`))
		stylesheet.insertRule(
			`.${class_name}{${strings.reduce((acc, value, index) => acc + `var(--${class_name}-${index - 1})` + value)}}`,
		)
	}

	const cache_key = `${class_name}\0${dynamics.map(v => String(v)).join('\0')}`
	const cached = cache.get(cache_key)
	if (cached) return cached

	/** @type {import('dhtml/client').Directive} */
	const directive = element => {
		const root = /** @type {Document | ShadowRoot} */ (element.getRootNode())
		if (!adopted.has(root)) {
			root.adoptedStyleSheets.push(stylesheet)
			adopted.add(root)
		}

		const { style, classList } = /** @type {HTMLElement} */ (element)

		classList.add(class_name)
		for (let i = 0; i < dynamics.length; i++) {
			style.setProperty(`--${class_name}-${i}`, String(dynamics[i]))
		}

		return () => {
			classList.remove(class_name)
			for (let i = 0; i < dynamics.length; i++) {
				style.setProperty(`--${class_name}-${i}`, null)
			}
		}
	}

	cache.set(cache_key, directive)
	return directive
}
