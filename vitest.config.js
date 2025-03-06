import { defineConfig } from 'vitest/config'

const prod = !!process.env.PROD

export default defineConfig({
	resolve: {
		alias: { dhtml: new URL(prod ? 'dist/html.min.js' : 'src/html.js', import.meta.url) },
	},
	define: {
		DHTML_PROD: prod,
	},
	test: {
		clearMocks: true,
		coverage: {
			enabled: true,
			reporter: ['text', 'json-summary', 'json', 'html'],
			reportOnFailure: true,
			include: ['src/html.js'],
		},
		browser: {
			enabled: true,
			headless: true,
			screenshotFailures: false,
			provider: 'playwright',
			instances: [{ browser: 'chromium' }],
		},
	},
})
