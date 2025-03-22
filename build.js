import terser from '@rollup/plugin-terser'
import MagicString from 'magic-string'
import { rm } from 'node:fs/promises'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { build } from 'rolldown'
import { walk } from 'zimmerframe'

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
		chunkFileNames: '[name].js',
		banner: '// @ts-nocheck',
	},
	define: {
		DHTML_PROD: 'false',
	},
})

const bundle = await build({
	input,
	plugins: [
		{
			transform(code, id, { moduleType }) {
				if (id.includes('node_modules')) return

				const ast = this.parse(code, { lang: moduleType })
				const source = new MagicString(code, { filename: id })

				walk(/** @type {import('@oxc-project/types').Node} */ (ast), null, {
					CallExpression(node, { next }) {
						if (node.callee.type === 'Identifier' && node.callee.name === 'assert') {
							source.update(node.start, node.end, ';')
							return
						}

						next()
					},
				})

				return { code: source.toString(), map: source.generateMap() }
			},
		},
	],
	output: {
		dir: 'dist/prod',
		chunkFileNames: '[name].js',
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
