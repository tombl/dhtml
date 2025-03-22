import { defineConfig } from 'vitest/config'

export default defineConfig({
	define: {
		DHTML_DEV: !process.env.PROD,
	},
	test: {
		clearMocks: true,
		coverage: {
			enabled: true,
			reporter: ['text', 'json-summary', 'json', 'html'],
			reportOnFailure: true,
			include: ['src/client/**', 'src/client.ts'],
			exclude: ['**/tests'],
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
