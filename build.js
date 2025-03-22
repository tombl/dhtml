import terser from '@rollup/plugin-terser'
import { createBundle } from 'dts-buddy'
import MagicString from 'magic-string'
import { readFile, rm, writeFile } from 'node:fs/promises'
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

await createBundle({
	project: 'tsconfig.json',
	output: 'dist/types.d.ts',
	modules: {
		dhtml: './src/index.client.ts',
		'dhtml/client': './src/client.ts',
		'dhtml/server': './src/server.ts',
	},
})

const pkg = JSON.parse(await readFile('package.json', 'utf8'))

delete pkg.scripts
delete pkg.devDependencies
delete pkg.prettier
;(function walk(exports) {
	if (typeof exports === 'string') {
		if (exports.startsWith('./src/')) exports = exports.slice('./src/'.length)
		exports = exports.replace(/\.ts$/, '')
		return {
			types: './types.d.ts',
			production: `./${exports}.min.js`,
			default: `./${exports}.js`,
		}
	}
	for (const key in exports) {
		exports[key] = walk(exports[key])
	}
	return exports
})(pkg.exports)

await writeFile('dist/package.json', JSON.stringify(pkg, null, 2))

console.table(
	Object.fromEntries(
		bundles.flatMap(bundle =>
			bundle.output.map(file => [
				file.fileName,
				{
					normal: file.code.length,
					gzip: gzipSync(file.code).length,
					brotli: brotliCompressSync(file.code).length,
				},
			]),
		),
	),
)
