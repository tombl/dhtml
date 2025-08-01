//#region src/index.ts
function html(statics, ...dynamics) {
	return {
		[html_tag]: true,
		_dynamics: dynamics,
		_statics: statics,
	}
}
;(globalThis.devtoolsFormatters ??= []).push({
	header(value) {
		if (!is_html(value)) return null
		const children = []
		for (let i = 0; i < value._dynamics.length; i++)
			children.push(value._statics[i], ['object', { object: value._dynamics[i] }])
		children.push(value._statics[value._statics.length - 1])
		return ['span', {}, 'html`', ...children, '`']
	},
	hasBody() {
		return false
	},
})

//#endregion
//#region src/shared/lexer.ts
const DATA = 0
const TAG_OPEN = 1
const END_TAG_OPEN = 2
const TAG_NAME = 3
const BEFORE_ATTR_NAME = 4
const ATTR_NAME = 5
const AFTER_ATTR_NAME = 6
const BEFORE_ATTR_VALUE = 7
const ATTR_VALUE_DOUBLE_QUOTED = 8
const ATTR_VALUE_SINGLE_QUOTED = 9
const ATTR_VALUE_UNQUOTED = 10
const AFTER_ATTR_VALUE = 11
const SELF_CLOSING_START_TAG = 12
const COMMENT2 = 13
const EXCLAIM = 14
const COMMENT = 15
const ALPHA = /[a-z]/i
function* lex(statics) {
	assert(!statics.some(s => s.includes('\0')))
	const input = statics.join('\0')
	let state = DATA
	let i = 0
	while (i < input.length) {
		const c = input[i++]
		switch (state) {
			case DATA:
				if (c === '<') state = TAG_OPEN
				break
			case TAG_OPEN:
				if (c === '!') state = EXCLAIM
				else if (c === '/') state = END_TAG_OPEN
				else if (c === '?') state = COMMENT2
				else {
					state = TAG_NAME
					i--
					continue
				}
				break
			case END_TAG_OPEN:
				if (c === '>') state = DATA
				else if (ALPHA.test(c)) {
					state = TAG_NAME
					i--
					continue
				} else {
					state = COMMENT2
					i--
					continue
				}
				break
			case TAG_NAME:
				if (c === '	' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '>') state = DATA
				break
			case BEFORE_ATTR_NAME:
				if (c === '	' || c === '\n' || c === '\f' || c === ' ') {
				} else if (c === '/' || c === '>') {
					state = AFTER_ATTR_NAME
					i--
					continue
				} else {
					state = ATTR_NAME
					i--
					continue
				}
				break
			case ATTR_NAME:
				if (c === '	' || c === '\n' || c === '\f' || c === ' ' || c === '/' || c === '>') {
					state = AFTER_ATTR_NAME
					i--
					continue
				} else if (c === '=') state = BEFORE_ATTR_VALUE
				break
			case AFTER_ATTR_NAME:
				if (c === '	' || c === '\n' || c === '\f' || c === ' ') {
				} else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '=') state = BEFORE_ATTR_VALUE
				else if (c === '>') state = DATA
				else {
					state = ATTR_NAME
					i--
					continue
				}
				break
			case BEFORE_ATTR_VALUE:
				if (c === '	' || c === '\n' || c === '\f' || c === ' ') {
				} else if (c === '"') state = ATTR_VALUE_DOUBLE_QUOTED
				else if (c === "'") state = ATTR_VALUE_SINGLE_QUOTED
				else if (c === '>') state = DATA
				else {
					state = ATTR_VALUE_UNQUOTED
					i--
					continue
				}
				break
			case ATTR_VALUE_DOUBLE_QUOTED:
				if (c === '"') state = AFTER_ATTR_VALUE
				break
			case ATTR_VALUE_SINGLE_QUOTED:
				if (c === "'") state = AFTER_ATTR_VALUE
				break
			case ATTR_VALUE_UNQUOTED:
				if (c === '	' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '>') state = DATA
				break
			case AFTER_ATTR_VALUE:
				if (c === '	' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '>') state = DATA
				else {
					state = BEFORE_ATTR_NAME
					i--
					continue
				}
				break
			case SELF_CLOSING_START_TAG:
				if (c === '>') state = DATA
				else {
					state = BEFORE_ATTR_NAME
					i--
					continue
				}
				break
			case COMMENT2:
				if (c === '>') state = DATA
				break
			case EXCLAIM:
				if (c === '-' && input[i] === '-') {
					i++
					yield ['-', COMMENT]
					state = COMMENT
				} else state = COMMENT2
				break
			case COMMENT:
				if (c === '-' && input[i] === '-' && input[i + 1] === '>') {
					yield ['-', COMMENT]
					i++
					yield ['-', COMMENT]
					i++
					yield ['>', COMMENT]
					state = DATA
					continue
				}
				break
			default:
		}
		yield [c, state]
	}
}

//#endregion
//#region src/shared.ts
function is_renderable(value) {
	return typeof value === 'object' && value !== null && 'render' in value
}
function is_iterable(value) {
	return typeof value === 'object' && value !== null && Symbol.iterator in value
}
function assert(value, message) {
	if (!value) {
		const error = new Error(message ?? 'assertion failed')
		Error.captureStackTrace?.(error, assert)
		throw error
	}
}
const html_tag = Symbol()
function is_html(value) {
	return typeof value === 'object' && value !== null && html_tag in value
}
function single_part_template(part) {
	return html`${part}`
}

//#endregion
export {
	ATTR_NAME,
	ATTR_VALUE_DOUBLE_QUOTED,
	ATTR_VALUE_SINGLE_QUOTED,
	ATTR_VALUE_UNQUOTED,
	COMMENT,
	COMMENT2,
	DATA,
	assert,
	html,
	is_html,
	is_iterable,
	is_renderable,
	lex,
	single_part_template,
}
//# sourceMappingURL=shared.js.map
