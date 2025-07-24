import MagicString from 'magic-string'
import assert from 'node:assert'
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
	const strip_asserts_plugin: rolldown.Plugin = {
		name: 'strip-asserts',
		transform(code, id, { moduleType }) {
			if (id.includes('node_modules')) return

			assert(moduleType === 'js' || moduleType === 'ts')
			const ast = this.parse(code, { lang: moduleType })
			const source = new MagicString(code, { filename: id })

			walk<import('@oxc-project/types').Node, null>(ast, null, {
				CallExpression(node, { next }) {
					if (node.callee.type === 'Identifier' && node.callee.name === 'assert') {
						source.update(node.start, node.end, 'undefined')
						return
					}

					next()
				},
			})

			return { code: source.toString(), map: source.generateMap() }
		},
	}

	const terser_name_cache = {}

	const terser_plugin: rolldown.Plugin = {
		name: 'terser',
		renderChunk(code) {
			const result = minify_sync(code, {
				mangle: { properties: { regex: /^_/ } },
				nameCache: terser_name_cache,
				sourceMap: true,
				module: true,
			})
			assert(result.code)
			assert(typeof result.map === 'string')
			return { code: result.code, map: result.map }
		},
	}

	const old_sizes: Record<string, number> = {}
	const print_size_plugin: rolldown.Plugin = {
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

	function define_bundle(env: 'dev' | 'prod'): rolldown.BuildOptions {
		const is_dev = env === 'dev'
		return {
			input: {
				client: './src/client.ts',
				server: './src/server.ts',
				index: './src/index.ts',
			},
			plugins: [!is_dev && strip_asserts_plugin, is_dev && dts({ sourcemap: true })],
			output: {
				dir: 'dist',
				entryFileNames: is_dev ? '[name].js' : '[name].min.js',
				chunkFileNames: is_dev ? '[name].js' : '[name].min.js',
				minify: !is_dev,
				sourcemap: is_dev ? true : 'hidden',
				plugins: [!is_dev && terser_plugin, print_size_plugin],
				minifyInternalExports: !is_dev,
			},
			optimization: {
				inlineConst: !is_dev,
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
