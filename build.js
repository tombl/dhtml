import terser from '@rollup/plugin-terser'
import { rm } from 'node:fs/promises'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { build } from 'rolldown'

try {
	await rm('dist', { recursive: true })
} catch {}

const input = {
	client: './src/client.ts',
	'index.client': './src/index.client.ts',

	server: './src/server.ts',
	'index.server': './src/index.server.ts',
}

await build({
	input,
	output: {
		dir: 'dist/dev',
    banner: "// @ts-nocheck"
	},
	define: {
		DHTML_PROD: 'false',
	},
})

const bundle = await build({
	input,
	output: {
		dir: 'dist/prod',
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

console.table(
	Object.fromEntries(
		bundle.output.map(file => [
			file.name,
			{
				normal: file.code.length,
				gzip: gzipSync(file.code).length,
				brotli: brotliCompressSync(file.code).length,
			},
		]),
	),
)
