const class_names = new WeakMap()
const adopted = new WeakSet()
const stylesheet = new CSSStyleSheet()
let next_id = 0

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
			`.${class_name}{${strings.reduce((acc, value, index) => acc + `var(--dyn-${index - 1})` + value)}}`,
		)
	}

	return element => {
		const root = /** @type {Document | ShadowRoot} */ (element.getRootNode())
		if (!adopted.has(root)) {
			root.adoptedStyleSheets.push(stylesheet)
			adopted.add(root)
		}

		const { style, classList } = /** @type {HTMLElement} */ (element)

		classList.add(class_name)
		for (let i = 0; i < dynamics.length; i++) {
			style.setProperty(`--dyn-${i}`, String(dynamics[i]))
		}

		return () => {
			classList.remove(class_name)
			for (let i = 0; i < dynamics.length; i++) {
				style.setProperty(`--dyn-${i}`, null)
			}
		}
	}
}
