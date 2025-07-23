import astV8ToIstanbul from 'ast-v8-to-istanbul'
import libCoverage from 'istanbul-lib-coverage'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseSync } from 'oxc-parser'

export type Coverage = import('node:inspector').Profiler.ScriptCoverage

export async function handle_coverage(coverage_entries: Coverage[]): Promise<void> {
	let coverage_map = libCoverage.createCoverageMap()

	for (const coverage of coverage_entries) {
		const path = url_to_file_path(coverage.url)
		if (!path) continue

		const code = await fs.readFile(path, 'utf8')

		coverage_map.merge(
			await astV8ToIstanbul({
				code,
				ast: parseSync(path, code),
				coverage: { functions: coverage.functions, url: pathToFileURL(path).toString() },
			}),
		)
	}

	coverage_map.filter(key => {
		if (key.includes('node_modules')) return false
		if (key.includes('tests')) return false
		return key.includes('src')
	})

	const context = libReport.createContext({ coverageMap: coverage_map })
	reports.create('html-spa').execute(context)
	reports.create('lcovonly').execute(context)
	reports.create('text').execute(context)
}

function url_to_file_path(url: string) {
	if (!URL.canParse(url)) return null

	const { protocol, pathname } = new URL(url)
	if (protocol === 'file:') return fileURLToPath(url)
	if (protocol === 'http:' || protocol === 'https:') return path.resolve(process.cwd(), pathname.slice(1))

	return null
}
