import { html } from 'dhtml'
import { assert_eq, test } from '../../../scripts/test/test.ts'
import { renderToString } from '../../server.ts'

const DEPTH = 10

test('basic recursion is handled correctly', () => {
	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return this
		},
	}
	assert_eq(renderToString(app), '<?[>'.repeat(DEPTH) + '<?[>hello!<?]>' + '<?]>'.repeat(DEPTH))
})

test('nested recursion is handled correctly', () => {
	const app = {
		renders: 0,
		render() {
			if (++this.renders > DEPTH) return 'hello!'
			return html`<span>${this}</span>`
		},
	}
	assert_eq(renderToString(app), '<?[><span>'.repeat(DEPTH) + '<?[>hello!<?]>' + '</span><?]>'.repeat(DEPTH))
})
