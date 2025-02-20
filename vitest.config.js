import { defineConfig } from 'vitest/config'

const ci = 'CI' in process.env

export default defineConfig({
	test: {
		coverage: {
			enabled: ci,
			reporter: ['text', 'json-summary', 'json'],
			reportOnFailure: true,
			include: ['src/html.js'],
		},
		browser: ci
			? {
					enabled: true,
					provider: 'playwright',
					instances: [{ browser: 'chromium' }],
				}
			: {
					enabled: true,
					provider: 'preview',
					instances: [{ browser: 'preview' }],
				},
	},
})
