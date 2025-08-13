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

// Operator mappings
const operators = {
	'+': { display: '+', canonical: '+' },
	'-': { display: '-', canonical: '-' },
	'*': { display: '×', canonical: '*' },
	'/': { display: '÷', canonical: '/' },
}

// Simple calculator app
const app = {
	display: '0',
	waitingForOperand: false,
	operator: null,
	value: null,
	inputDigit(digit) {
		if (this.waitingForOperand) {
			this.display = digit === '.' ? '0.' : String(digit)
			this.waitingForOperand = false
		} else {
			if (this.display === '0' && digit !== '.') this.display = String(digit)
			else if (digit === '.' && this.display.includes('.')) return
			else this.display = this.display + digit
		}
	},
	inputDot() {
		if (this.waitingForOperand) {
			this.display = '0.'
			this.waitingForOperand = false
			return
		}
		if (!this.display.includes('.')) this.display = this.display + '.'
	},
	clear() {
		this.display = '0'
		this.value = null
		this.operator = null
		this.waitingForOperand = false
	},
	negate() {
		if (this.display === '0') return
		if (this.display.startsWith('-')) this.display = this.display.slice(1)
		else this.display = '-' + this.display
	},
	percent() {
		const num = parseFloat(this.display) || 0
		this.display = String(num / 100)
	},
	op(nextOp) {
		// If clicking the same operator that's already active, deactivate it
		if (this.operator === nextOp) {
			this.operator = null
			this.waitingForOperand = false
			return
		}

		const inputValue = parseFloat(this.display)
		if (this.value == null) {
			this.value = inputValue
		} else if (this.operator) {
			const result = performOperation(this.value, inputValue, this.operator)
			this.value = result
			this.display = String(result)
		}
		this.operator = nextOp
		this.waitingForOperand = true
	},
	equals() {
		const inputValue = parseFloat(this.display)
		if (this.operator && this.value != null) {
			const result = performOperation(this.value, inputValue, this.operator)
			this.display = String(result)
			this.value = null
			this.operator = null
			this.waitingForOperand = true
		}
	},
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
						${this.value != null
							? `${this.value} ${this.operator ? operators[this.operator]?.display || this.operator : ''}`
							: ''}
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
					${button('C', () => this.clear(), { bg: '#f3f4f6' }, this)}
					${button('+/-', () => this.negate(), { bg: '#f3f4f6' }, this)}
					${button('%', () => this.percent(), { bg: '#f3f4f6' }, this)}
					${button('÷', () => this.op('/'), { bg: '#e2e8f0', color: '#1e293b' }, this)} ${digitButton('7', this)}
					${digitButton('8', this)} ${digitButton('9', this)}
					${button('×', () => this.op('*'), { bg: '#e2e8f0', color: '#1e293b' }, this)} ${digitButton('4', this)}
					${digitButton('5', this)} ${digitButton('6', this)}
					${button('-', () => this.op('-'), { bg: '#e2e8f0', color: '#1e293b' }, this)} ${digitButton('1', this)}
					${digitButton('2', this)} ${digitButton('3', this)}
					${button('+', () => this.op('+'), { bg: '#e2e8f0', color: '#1e293b' }, this)}
					${button('0', () => this.inputDigit('0'), { span: 2 }, this)} ${digitButton('.', this)}
					${button('=', () => this.equals(), { bg: '#334155', color: '#fff' }, this)}
				</div>
			</div>
		`
	},
}

function button(label, onClick, opts = {}, app) {
	const isOperator = Object.values(operators).some(op => op.display === label)
	const operatorData = Object.values(operators).find(op => op.display === label)
	const active = isOperator && app?.operator === operatorData?.canonical

	const getButtonColor = bgKey => {
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
		background: ${getButtonColor(opts.bg)};
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

function digitButton(d, app) {
	return button(
		d,
		() => {
			if (d === '.') app.inputDot()
			else app.inputDigit(d)
		},
		{},
		app,
	)
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
