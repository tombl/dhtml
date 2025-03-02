import { defineConfig } from 'vitest/config'

const ci = !!process.env.CI
const prod = !!process.env.PROD

export default defineConfig({
	resolve: {
		alias: { dhtml: new URL(prod ? 'dist/html.min.js' : 'src/html.js', import.meta.url) },
	},
	define: {
		DHTML_PROD: prod,
	},
	test: {
		coverage: {
			enabled: ci,
			reporter: ['text', 'json-summary', 'json'],
			reportOnFailure: true,
			include: ['src/html.js'],
		},
		browser: {
			enabled: true,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }],
		},
	},
})
