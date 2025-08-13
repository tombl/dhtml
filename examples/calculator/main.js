import { html } from 'dhtml'
import { createRoot, invalidate } from 'dhtml/client'
import { css } from './css.js'

css`
	/* Theme colors */
	--bg-body: #f8f9fa;
	--bg-container: #fff;
	--bg-display: #f7f7f9;
	--bg-buttons: #fff;
	--bg-button-default: #f5f5f5;
	--bg-button-function: #f3f4f6;
	--bg-button-operator: #e2e8f0;
	--bg-button-equals: #334155;
	--bg-button-operator-active: #64748b;
	--text-primary: #000;
	--text-secondary: #999;
	--text-button: #111;
	--text-button-operator: #1e293b;
	--text-button-light: #fff;
	--border-color: #ddd;
	--shadow: rgba(0, 0, 0, 0.08);

	@media (prefers-color-scheme: dark) {
		--bg-body: #0a0a0a;
		--bg-container: #0d0d0d;
		--bg-display: #1f1f1f;
		--bg-buttons: #0d0d0d;
		--bg-button-default: #2d2d2d;
		--bg-button-function: #404040;
		--bg-button-operator: #475569;
		--bg-button-equals: #64748b;
		--bg-button-operator-active: #64748b;
		--text-primary: #fff;
		--text-secondary: #666;
		--text-button: #fff;
		--text-button-operator: #e2e8f0;
		--text-button-light: #fff;
		--border-color: #333;
		--shadow: rgba(0, 0, 0, 0.3);
	}

	background-color: var(--bg-body);
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
					border: 1px solid var(--border-color);
					border-radius: 12px;
					box-shadow: 0 6px 24px var(--shadow);
					overflow: hidden;
				`}
			>
				<div
					${css`
						background: var(--bg-display);
						padding: 20px;
						text-align: right;
					`}
				>
					<div
						${css`
							color: var(--text-secondary);
							font-size: 14px;
							margin-bottom: 6px;
							height: 18px; /* reserve space to avoid layout shift */
							line-height: 18px;
							overflow: hidden;
						`}
					>
						${this.value != null ? `${this.value} ${this.operator || ''}` : ''}
					</div>
					<div
						${css`
							font-size: 36px;
							font-weight: 600;
							margin-top: 0px;
							color: var(--text-primary);
						`}
					>
						${this.display}
					</div>
				</div>
				<div
					${css`
						padding: 12px;
						background: var(--bg-buttons);
						display: grid;
						grid-template-columns: repeat(4, 1fr);
						gap: 8px;
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

	const getButtonColor = (bgKey, colorKey) => {
		if (active) return 'var(--bg-button-operator-active)'

		const colorMap = {
			'#f3f4f6': 'var(--bg-button-function)',
			'#e2e8f0': 'var(--bg-button-operator)',
			'#334155': 'var(--bg-button-equals)',
		}
		return colorMap[bgKey] || 'var(--bg-button-default)'
	}

	const getTextColor = colorKey => {
		const colorMap = {
			'#1e293b': 'var(--text-button-operator)',
			'#fff': 'var(--text-button-light)',
		}
		return colorMap[colorKey] || 'var(--text-button)'
	}

	const styles = css`
		padding: 14px 12px;
		background: ${getButtonColor(opts.bg, opts.color)};
		color: ${getTextColor(opts.color)};
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
