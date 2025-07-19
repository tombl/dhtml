globalThis.__DEV__ = true
const lexer = await import('../src/shared/lexer.ts')

const names = Object.fromEntries(
	Object.entries(lexer)
		.filter(([name, value]) => typeof value === 'number')
		.map(([name, value]) => [value, name]),
)

function tsa(...strings: string[]): TemplateStringsArray {
	return Object.assign(strings, { raw: strings })
}

for (const entry of process.argv.slice(2)) {
	const statics = entry.split('$')
	console.log(statics)
	for (const [char, state] of lexer.lex(tsa(...statics))) {
		console.log(JSON.stringify(char), names[state])
	}
}

export {}
