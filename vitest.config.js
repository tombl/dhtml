import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		browser: process.env.CI
			? {
					enabled: true,
					provider: 'playwright',
					instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
				}
			: {
					enabled: true,
					provider: 'preview',
					instances: [{ browser: 'preview' }],
				},
	},
})
