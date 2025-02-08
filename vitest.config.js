import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: 'test/*.js',
		exclude: 'test/_*.js',
		environment: 'happy-dom',
	},
})
