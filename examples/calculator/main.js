import { html } from 'dhtml'
import { createRoot, invalidate } from 'dhtml/client'
import { css } from './css.js'

css`
	background-color: #f8f9fa;
	@media (prefers-color-scheme: dark) {
		background-color: #0a0a0a;
	}
`(document.body)

// Simple calculator app
const app = {
	display: '0',
	waitingForOperand: false,
	operator: null,
	value: null,
	render() {
		return html`
			<div
				${css`
					font-family:
						system-ui,
						-apple-system,
						'Segoe UI',
						Roboto,
						'Helvetica Neue',
						Arial;
					max-width: 360px;
					margin: 48px auto;
					border: 1px solid #ddd;
					border-radius: 12px;
					box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
					overflow: hidden;

					@media (prefers-color-scheme: dark) {
						border-color: #333;
						box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
					}
				`}
			>
				<div
					${css`
						background: #f7f7f9;
						padding: 20px;
						text-align: right;

						@media (prefers-color-scheme: dark) {
							background: #1f1f1f;
						}
					`}
				>
					<div
						${css`
							color: #999;
							font-size: 14px;
							margin-bottom: 6px;
							height: 18px; /* reserve space to avoid layout shift */
							line-height: 18px;
							overflow: hidden;

							@media (prefers-color-scheme: dark) {
								color: #666;
							}
						`}
					>
						${this.value != null ? `${this.value} ${this.operator || ''}` : ''}
					</div>
					<div
						${css`
							font-size: 36px;
							font-weight: 600;
							margin-top: 0px;
							color: #000;

							@media (prefers-color-scheme: dark) {
								color: #fff;
							}
						`}
					>
						${this.display}
					</div>
				</div>
				<div
					${css`
						padding: 12px;
						background: #fff;
						display: grid;
						grid-template-columns: repeat(4, 1fr);
						gap: 8px;

						@media (prefers-color-scheme: dark) {
							background: #0d0d0d;
						}
					`}
				>
					${button('C', () => clear(), { bg: '#f3f4f6' })} ${button('+/-', () => negate(), { bg: '#f3f4f6' })}
					${button('%', () => percent(), { bg: '#f3f4f6' })}
					${button('÷', () => op('/'), { bg: '#e2e8f0', color: '#1e293b' })} ${digitButton('7')} ${digitButton('8')}
					${digitButton('9')} ${button('×', () => op('*'), { bg: '#e2e8f0', color: '#1e293b' })} ${digitButton('4')}
					${digitButton('5')} ${digitButton('6')} ${button('-', () => op('-'), { bg: '#e2e8f0', color: '#1e293b' })}
					${digitButton('1')} ${digitButton('2')} ${digitButton('3')}
					${button('+', () => op('+'), { bg: '#e2e8f0', color: '#1e293b' })}
					${button('0', () => inputDigit('0'), { span: 2 })} ${digitButton('.')}
					${button('=', () => equals(), { bg: '#334155', color: '#fff' })}
				</div>
			</div>
		`
	},
}

function button(label, onClick, opts = {}) {
	const isOperator = ['+', '-', '×', '÷'].includes(label)
	const active =
		isOperator &&
		app.operator &&
		((label === '×' && app.operator === '*') || (label === '÷' && app.operator === '/') || label === app.operator)

	const styles = css`
		padding: 14px 12px;
		background: ${active ? opts.bgActive || '#fb923c' : opts.bg || '#f5f5f5'};
		color: ${opts.color || '#111'};
		border-radius: 8px;
		font-size: 18px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		user-select: none;
		&:active {
			transform: translateY(1px);
		}

		@media (prefers-color-scheme: dark) {
			background: ${active
				? opts.bgActive || '#fb923c'
				: opts.bg === '#f3f4f6'
					? '#404040'
					: opts.bg === '#e2e8f0'
						? '#475569'
						: opts.bg === '#334155'
							? '#64748b'
							: opts.bg || '#2d2d2d'};
			color: ${opts.color === '#1e293b' ? '#e2e8f0' : opts.color || '#fff'};
		}
	`
	const spanStyles = opts.span
		? css`
				grid-column: span ${opts.span};
			`
		: null

	return html`<div
		${styles}
		${spanStyles}
		onclick=${() => {
			onClick()
			invalidate(app)
		}}
	>
		${label}
	</div>`
}

function digitButton(d) {
	return button(d, () => {
		if (d === '.') inputDot()
		else inputDigit(d)
	})
}

function inputDigit(digit) {
	if (app.waitingForOperand) {
		app.display = digit === '.' ? '0.' : String(digit)
		app.waitingForOperand = false
	} else {
		if (app.display === '0' && digit !== '.') app.display = String(digit)
		else if (digit === '.' && app.display.includes('.')) return
		else app.display = app.display + digit
	}
}

function inputDot() {
	if (app.waitingForOperand) {
		app.display = '0.'
		app.waitingForOperand = false
		return
	}
	if (!app.display.includes('.')) app.display = app.display + '.'
}

function clear() {
	app.display = '0'
	app.value = null
	app.operator = null
	app.waitingForOperand = false
}

function negate() {
	if (app.display === '0') return
	if (app.display.startsWith('-')) app.display = app.display.slice(1)
	else app.display = '-' + app.display
}

function percent() {
	const num = parseFloat(app.display) || 0
	app.display = String(num / 100)
}

function op(nextOp) {
	const inputValue = parseFloat(app.display)
	if (app.value == null) {
		app.value = inputValue
	} else if (app.operator) {
		const result = performOperation(app.value, inputValue, app.operator)
		app.value = result
		app.display = String(result)
	}
	app.operator = nextOp
	app.waitingForOperand = true
}

function equals() {
	const inputValue = parseFloat(app.display)
	if (app.operator && app.value != null) {
		const result = performOperation(app.value, inputValue, app.operator)
		app.display = String(result)
		app.value = null
		app.operator = null
		app.waitingForOperand = true
	}
}

function performOperation(a, b, op) {
	if (op === '+') return round(a + b)
	if (op === '-') return round(a - b)
	if (op === '*') return round(a * b)
	if (op === '/') return b === 0 ? 'Error' : round(a / b)
	return b
}

function round(n) {
	if (typeof n === 'string') return n
	return Math.round((n + Number.EPSILON) * 1e12) / 1e12
}

createRoot(document.body).render(app)
