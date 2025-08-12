import { html } from 'dhtml'
import { createRoot, invalidate } from 'dhtml/client'
import { css } from './css.js'

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
				`}
			>
				<div
					${css`
						background: #f7f7f9;
						padding: 20px;
						text-align: right;
					`}
				>
					<div
						${css`
							color: #666;
							font-size: 14px;
						`}
					>
						Calculator
					</div>
					<div
						${css`
							font-size: 36px;
							font-weight: 600;
							margin-top: 6px;
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
					`}
				>
					${button('C', () => clear(), { bg: '#f3f4f6' })} ${button('+/-', () => negate(), { bg: '#f3f4f6' })}
					${button('%', () => percent(), { bg: '#f3f4f6' })}
					${button('÷', () => op('/'), { bg: '#ffb86b', color: '#fff' })} ${digitButton('7')} ${digitButton('8')}
					${digitButton('9')} ${button('×', () => op('*'), { bg: '#ffb86b', color: '#fff' })} ${digitButton('4')}
					${digitButton('5')} ${digitButton('6')} ${button('-', () => op('-'), { bg: '#ffb86b', color: '#fff' })}
					${digitButton('1')} ${digitButton('2')} ${digitButton('3')}
					${button('+', () => op('+'), { bg: '#ffb86b', color: '#fff' })}
					${button('0', () => inputDigit('0'), { span: 2 })} ${digitButton('.')}
					${button('=', () => equals(), { bg: '#4ade80', color: '#fff' })}
				</div>
			</div>
		`
	},
}

function button(label, onClick, opts = {}) {
	const styles = css`
		padding: 14px 12px;
		background: ${opts.bg || '#e9eef8'};
		color: ${opts.color || '#111'};
		border-radius: 8px;
		font-size: 18px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		user-select: none;
		${opts.span ? `grid-column: span ${opts.span};` : ''}
		&:active {
			transform: translateY(1px);
		}
	`
	return html`<div
		${styles}
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
