import replace from '@rollup/plugin-replace'
import MagicString from 'magic-string'
import assert from 'node:assert'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { parseArgs, styleText } from 'node:util'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { minify } from 'oxc-minify'
import { transform } from 'oxc-transform'
import * as rollup from 'rollup'
import { dts } from 'rollup-plugin-dts'
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
	const oxc_transform_plugin: rollup.Plugin = {
		name: 'oxc-transform',
		transform(code, id) {
			return transform(id, code, { sourcemap: true })
		},
	}
	const oxc_transform_types_plugin: rollup.Plugin = {
		name: 'oxc-transform-types',
		transform(code, id) {
			const { declaration, declarationMap } = transform(id, code, {
				sourcemap: true,
				typescript: { declaration: { stripInternal: true, sourcemap: true } },
			})
			return { code: declaration, map: declarationMap }
		},
	}
	const oxc_minify_plugin: rollup.OutputPlugin = {
		name: 'oxc-minify',
		renderChunk(code, { fileName }) {
			return minify(fileName, code, {
				sourcemap: true,
				mangle: { toplevel: true },
			})
		},
	}

	const strip_asserts_plugin: rollup.Plugin = {
		name: 'strip-asserts',
		transform(code, id) {
			if (id.includes('node_modules')) return

			const ast = this.parse(code)
			const source = new MagicString(code, { filename: id })

			walk<rollup.AstNode, null>(ast, null, {
				CallExpression(node: rollup.RollupAstNode<import('estree').CallExpression>, { next }) {
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
	const terser_plugin: rollup.OutputPlugin = {
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
	const print_size_plugin: rollup.OutputPlugin = {
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

	function define_bundle(env: 'dev' | 'prod') {
		const is_dev = env === 'dev'
		const is_prod = env === 'prod'
		const is_dts = env === 'dts'
		const ext = {
			dev: 'js',
			prod: 'min.js',
			dts: 'd.ts',
		}[env]

		return {
			input: {
				client: './src/client.ts',
				server: './src/server.ts',
				index: './src/index.ts',
			},
			plugins: is_dts
				? [oxc_transform_types_plugin, dts()]
				: [
						oxc_transform_plugin,
						replace({
							preventAssignment: true,
							values: {
								__DEV__: JSON.stringify(is_dev),
							},
						}),
						is_prod && strip_asserts_plugin,
					],
			output: {
				dir: 'dist',
				entryFileNames: `[name].${ext}`,
				chunkFileNames: `[name].${ext}`,
				sourcemap: is_dev ? true : 'hidden',
				plugins: [is_prod && terser_plugin, is_prod && oxc_minify_plugin, print_size_plugin],
			},
		} satisfies rollup.RollupOptions
	}

	console.log(
		styleText(['bold'], ['name'.padEnd(14), 'size'.padStart(8), 'gzip'.padStart(8), 'brotli'.padStart(8)].join(' ')),
	)

	if (args.values.watch) {
		rollup.watch([define_bundle('dev'), define_bundle('prod'), define_bundle('dts')])
	} else {
		const prod = define_bundle('prod')
		const dev = define_bundle('dev')
		const dts = define_bundle('dts')
		await Promise.all([
			rollup.rollup(prod).then(bundle => bundle.write(prod.output)),
			rollup.rollup(dev).then(bundle => bundle.write(dev.output)),
			rollup.rollup(dts).then(bundle => bundle.write(dts.output)),
		])
	}
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
