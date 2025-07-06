import MagicString from 'magic-string'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { parseArgs, styleText } from 'node:util'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import * as rolldown from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import { minify_sync } from 'terser'
import { walk } from 'zimmerframe'

const args = parseArgs({
	options: {
		watch: { type: 'boolean', short: 'w', default: false },
	},
})

await rm('dist', { recursive: true, force: true })
await mkdir('dist')

await Promise.all([bundle_code(), write_package_json()])

async function bundle_code() {
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

	const terser_name_cache = {}

	/** @type {import('rolldown').Plugin} */
	const terser_plugin = {
		name: 'terser',
		renderChunk(code) {
			return minify_sync(code, {
				mangle: { properties: { regex: /^_/ } },
				nameCache: terser_name_cache,
				module: true,
			})
		},
	}

	/** @type {Record<string, number>} */
	const old_sizes = {}
	/** @type {import('rolldown').Plugin} */
	const print_size_plugin = {
		name: 'print-size',
		generateBundle(_options, bundle) {
			for (const [name, file] of Object.entries(bundle)) {
				if (file.type === 'asset') continue
				const normal = file.code.length
				const gzip = gzipSync(file.code).length
				const brotli = brotliCompressSync(file.code).length

				const line = [
					name.padEnd(14),
					normal.toString().padStart(8),
					gzip.toString().padStart(8),
					brotli.toString().padStart(8),
				]
				if (name in old_sizes) {
					const old = old_sizes[name]
					const diff = brotli - old
					if (diff !== 0) {
						line.push(`${diff > 0 ? '+' : '-'}${Math.abs(diff)}`)
						console.log(line.join(' '))
					}
				} else {
					console.log(line.join(' '))
				}
				old_sizes[name] = brotli
			}
		},
	}

	/** @returns {import('rolldown').BuildOptions} */
	function define_bundle(env) {
		const input = {
			client: './src/client.ts',
			server: './src/server.ts',
			index: './src/index.ts',
		}

		const is_dev = env === 'dev'
		return {
			input,
			plugins: [!is_dev && strip_asserts_plugin, is_dev && dts({ sourcemap: true })],
			output: {
				dir: 'dist',
				entryFileNames: is_dev ? '[name].js' : '[name].min.js',
				chunkFileNames: is_dev ? '[name].js' : '[name].min.js',
				minify: !is_dev,
				plugins: [!is_dev && terser_plugin],
				sourcemap: is_dev ? true : 'hidden',
				plugins: [print_size_plugin],
			},
			define: {
				__DEV__: JSON.stringify(is_dev),
			},
		}
	}

	console.log(
		styleText(['bold'], ['name'.padEnd(14), 'size'.padStart(8), 'gzip'.padStart(8), 'brotli'.padStart(8)].join(' ')),
	)
	await (args.values.watch ? rolldown.watch : rolldown.build)([define_bundle('dev'), define_bundle('prod')])
}

async function write_package_json() {
	const pkg = JSON.parse(await readFile('package.json', 'utf8'))

	delete pkg.scripts
	delete pkg.devDependencies
	delete pkg.prettier
	delete pkg.workspaces
	;(function walk(exports) {
		if (typeof exports === 'string') {
			if (exports.startsWith('./src/')) exports = exports.slice('./src/'.length)
			exports = exports.replace(/\.ts$/, '')
			return {
				types: `./${exports}.d.ts`,
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
}
