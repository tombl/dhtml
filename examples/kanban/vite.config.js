import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	optimizeDeps: {
		exclude: ['sqlocal'],
	},
	esbuild: { target: 'es2024' },
	worker: { format: 'es' },
	plugins: [
		tsconfigPaths(),
		{
			name: 'configure-response-headers',
			configureServer: server => {
				server.middlewares.use((_req, res, next) => {
					res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
					res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
					next()
				})
			},
		},
	],
})
