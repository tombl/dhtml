import terser from '@rollup/plugin-terser'
import MagicString from 'magic-string'
import { rm } from 'node:fs/promises'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { build } from 'rolldown'
import { walk } from 'zimmerframe'

try {
	await rm('dist', { recursive: true })
} catch {}

/** @type {import('rolldown').Plugin} */
const strip_asserts_plugin = {
	name: 'strip-asserts',
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
}

/** @returns {import('rolldown').BuildOptions} */
function define_bundle(env, runtime) {
	const is_dev = env === 'dev'

	return {
		input: {
			[runtime]: `./src/${runtime}.ts`,
			[`index.${runtime}`]: `./src/index.${runtime}.ts`,
		},
		plugins: [!is_dev && strip_asserts_plugin],
		output: {
			dir: 'dist',
			entryFileNames: is_dev ? '[name].js' : '[name].min.js',
			chunkFileNames: is_dev ? '[name].js' : '[name].min.js',
			banner: is_dev ? '// @ts-nocheck' : undefined,
			minify: !is_dev,
			plugins: [
				!is_dev &&
					terser({
						mangle: { properties: { regex: /^_/ } },
					}),
			],
		},
		define: {
			DHTML_PROD: JSON.stringify(!is_dev),
		},
	}
}

const bundles = await build([
	define_bundle('dev', 'client'),
	define_bundle('dev', 'server'),
	define_bundle('prod', 'client'),
	define_bundle('prod', 'server'),
])

for (const bundle of bundles) {
	console.table(
		Object.fromEntries(
			bundle.output.map(file => [
				file.fileName,
				{
					normal: file.code.length,
					gzip: gzipSync(file.code).length,
					brotli: brotliCompressSync(file.code).length,
				},
			]),
		),
	)
}
