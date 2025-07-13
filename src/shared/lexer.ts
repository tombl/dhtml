import { assert } from '../shared.ts'

export const DATA = 0
export const TAG_OPEN = 1
export const END_TAG_OPEN = 2
export const TAG_NAME = 3
export const BEFORE_ATTR_NAME = 4
export const ATTR_NAME = 5
export const AFTER_ATTR_NAME = 6
export const BEFORE_ATTR_VALUE = 7
export const ATTR_VALUE_DOUBLE_QUOTED = 8
export const ATTR_VALUE_SINGLE_QUOTED = 9
export const ATTR_VALUE_UNQUOTED = 10
export const AFTER_ATTR_VALUE = 11
export const SELF_CLOSING_START_TAG = 12
export const COMMENT2 = 13 // a comment2 is any type of comment that ends with ">" and not "-->"
export const EXCLAIM = 14
export const COMMENT = 15

export type State =
	| typeof DATA
	| typeof TAG_OPEN
	| typeof END_TAG_OPEN
	| typeof TAG_NAME
	| typeof BEFORE_ATTR_NAME
	| typeof ATTR_NAME
	| typeof AFTER_ATTR_NAME
	| typeof BEFORE_ATTR_VALUE
	| typeof ATTR_VALUE_DOUBLE_QUOTED
	| typeof ATTR_VALUE_SINGLE_QUOTED
	| typeof ATTR_VALUE_UNQUOTED
	| typeof AFTER_ATTR_VALUE
	| typeof SELF_CLOSING_START_TAG
	| typeof COMMENT2
	| typeof EXCLAIM
	| typeof COMMENT

const ALPHA = /[a-z]/i

export function* lex(statics: TemplateStringsArray): Generator<[char: string, state: State], void, void> {
	assert(!statics.some(s => s.includes('\0')))

	const input = statics.join('\0')

	let state: State = DATA
	let i = 0

	while (i < input.length) {
		const c = input[i++]

		switch (state) {
			case DATA: // https://html.spec.whatwg.org/multipage/parsing.html#data-state
				if (c === '<') state = TAG_OPEN
				break

			case TAG_OPEN: // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
				if (c === '!') state = EXCLAIM
				else if (c === '/') state = END_TAG_OPEN
				else if (c === '?') state = COMMENT2
				else {
					state = TAG_NAME
					i--
					continue
				}
				break

			case END_TAG_OPEN: // https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
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

			case TAG_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#tag-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '>') state = DATA
				break

			case BEFORE_ATTR_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
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

			case ATTR_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ' || c === '/' || c === '>') {
					state = AFTER_ATTR_NAME
					i--
					continue
				} else if (c === '=') state = BEFORE_ATTR_VALUE
				break

			case AFTER_ATTR_NAME: // https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-name-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ' || c === '/') {
				} else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '=') state = BEFORE_ATTR_VALUE
				else if (c === '>') state = DATA
				else {
					state = ATTR_NAME
					i--
					continue
				}
				break

			case BEFORE_ATTR_VALUE: // https://html.spec.whatwg.org/multipage/parsing.html#before-attribute-value-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
				} else if (c === '"') state = ATTR_VALUE_DOUBLE_QUOTED
				else if (c === "'") state = ATTR_VALUE_SINGLE_QUOTED
				else if (c === '>') state = DATA
				else {
					state = ATTR_VALUE_UNQUOTED
					i--
					continue
				}
				break

			case ATTR_VALUE_DOUBLE_QUOTED: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
				if (c === '"') state = AFTER_ATTR_VALUE
				break

			case ATTR_VALUE_SINGLE_QUOTED: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(single-quoted)-state
				if (c === "'") state = AFTER_ATTR_VALUE
				break

			case ATTR_VALUE_UNQUOTED: // https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(unquoted)-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '>') state = DATA
				break

			case AFTER_ATTR_VALUE: // https://html.spec.whatwg.org/multipage/parsing.html#after-attribute-value-(quoted)-state
				if (c === '\t' || c === '\n' || c === '\f' || c === ' ') state = BEFORE_ATTR_NAME
				else if (c === '/') state = SELF_CLOSING_START_TAG
				else if (c === '>') state = DATA
				else {
					state = BEFORE_ATTR_NAME
					i--
					continue
				}
				break

			case SELF_CLOSING_START_TAG: // https://html.spec.whatwg.org/multipage/parsing.html#self-closing-start-tag-state
				if (c === '>') state = DATA
				else {
					state = BEFORE_ATTR_NAME
					i--
					continue
				}
				break

			case COMMENT2: // https://html.spec.whatwg.org/multipage/parsing.html#bogus-comment-state
				if (c === '>') state = DATA
				break

			case EXCLAIM: // https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
				if (c === '-' && input[i] === '-') {
					i++
					yield ['-', COMMENT]
					state = COMMENT
				} else {
					state = COMMENT2
				}
				break

			case COMMENT: // https://html.spec.whatwg.org/multipage/parsing.html#comment-state
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
				state satisfies never
		}

		yield [c, state]
	}
}
