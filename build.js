import { build } from 'rolldown'
import terser from '@rollup/plugin-terser'
import { gzipSync, brotliCompressSync } from 'node:zlib'

await build({
	input: {
		client: './src/client.ts',
		server: './src/server.ts',
	},
	output: {
		dir: 'dist',
	},
	define: {
		DHTML_PROD: 'false',
	},
})

const bundle = await build({
	input: {
		client: './src/client.ts',
		server: './src/server.ts',
	},
	output: {
		dir: 'dist',
		entryFileNames: '[name].min.js',
		plugins: [
			terser({
				mangle: { properties: { regex: /^_/ } },
			}),
		],
		minify: true,
	},
	define: {
		DHTML_PROD: 'true',
	},
})

for (const file of bundle.output) {
	console.group(file.name)
	console.log(`normal: ${file.code.length}`)
	console.log(`gzip: ${gzipSync(file.code).length}`)
	console.log(`brotli: ${brotliCompressSync(file.code).length}`)
	console.groupEnd(file.name)
}
