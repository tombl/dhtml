import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

export type Coverage = import('puppeteer').Protocol.Profiler.ScriptCoverage

interface LcovFunction {
	name: string
	line: number
	hit: number
}

interface LcovLine {
	line: number
	hit: number
}

interface LcovFile {
	functions: LcovFunction[]
	lines: LcovLine[]
}

export async function v8_to_lcov(coverage: Coverage[]): Promise<string> {
	const files: Record<string, LcovFile> = {}

	for (const script of coverage) {
	  if (script.url.includes('node_modules')) continue

		const path = url_to_file_path(script.url)
		if (!path) continue

		const source_code = await fs.readFile(path, 'utf-8')
		const offset_to_line = build_offset_to_line(source_code)

		process_script_coverage(script, (files[path] ??= { functions: [], lines: [] }), offset_to_line)
	}

	return generate_lcov_output(files)
}

function url_to_file_path(url: string) {
	if (!URL.canParse(url)) return null

	const { protocol, pathname } = new URL(url)
	if (protocol === 'file:') return fileURLToPath(url)
	if (protocol === 'http:' || protocol === 'https:') return path.resolve(process.cwd(), pathname.slice(1))

	return null
}

function build_offset_to_line(source_code: string) {
	const lines: number[] = [0]

	for (let i = 0; i < source_code.length; i++) {
		if (source_code[i] === '\n') lines.push(i + 1)
	}

	return (offset: number) => {
		if (offset >= source_code.length) return lines.length - 1

		let left = 0
		let right = lines.length - 1

		while (left <= right) {
			const mid = Math.floor((left + right) / 2)
			if (mid === lines.length - 1 || (lines[mid] <= offset && lines[mid + 1] > offset)) return mid + 1
			if (lines[mid] > offset) right = mid - 1
			else left = mid + 1
		}

		return 1
	}
}

function process_script_coverage(script: Coverage, file: LcovFile, offset_to_line: (offset: number) => number) {
	const line_counts = Object.fromEntries(file.lines.map(({ line, hit }) => [line, hit]))
	const function_data = Object.fromEntries(
		file.functions.map(({ name, line, hit }) => [`${name}:${line}`, { line, hit }]),
	)

	const unexecuted_lines = new Set<number>()

	for (const func of script.functions) {
		const function_name = func.functionName || '<anonymous>'

		if (func.ranges.length > 0) {
			const line = offset_to_line(func.ranges[0].startOffset)
			const total_hits = func.ranges.reduce((acc, range) => acc + range.count, 0)

			if (function_name !== '<anonymous>' && total_hits === 0) {
				for (const range of func.ranges) {
					const start_line = offset_to_line(range.startOffset)
					const end_line = offset_to_line(range.endOffset)
					for (let line = start_line; line <= end_line; line++) {
						unexecuted_lines.add(line)
					}
				}
			}

			for (const range of func.ranges) {
				if (range.count > 0) {
					const start_line = offset_to_line(range.startOffset)
					const end_line = offset_to_line(range.endOffset)
					for (let line = start_line; line <= end_line; line++) {
						line_counts[line] ??= 0
						line_counts[line] += range.count
					}
				}
			}

			function_data[`${function_name}:${line}`] ??= { line, hit: 0 }
			function_data[`${function_name}:${line}`].hit += total_hits
		}
	}

	for (const line of unexecuted_lines) line_counts[line] = 0

	file.functions = Object.entries(function_data)
		.map(([key, data]) => ({
			name: key.split(':')[0],
			line: data.line,
			hit: data.hit,
		}))
		.sort((a, b) => a.line - b.line)

	file.lines = Object.entries(line_counts)
		.map(([line, count]) => ({ line: +line, hit: count }))
		.sort((a, b) => a.line - b.line)
}

function make_unique_function_names(functions: LcovFunction[]): LcovFunction[] {
	const counts: Record<string, number> = {}
	for (const func of functions) {
		counts[func.name] ??= 0
		counts[func.name]++
	}
	return functions.map(({ name, line, hit }) => {
		if (counts[name] > 1) name += `:${line}`
		return { name, line, hit }
	})
}

function generate_lcov_output(files: Record<string, LcovFile>) {
	const output: string[] = []

	for (const [path, { functions, lines }] of Object.entries(files)) {
		output.push(`SF:${path}`)

		const unique_functions = make_unique_function_names(functions)

		for (const func of unique_functions) {
			output.push(`FN:${func.line},${func.name}`)
			output.push(`FNDA:${func.hit},${func.name}`)
		}

		output.push(`FNF:${unique_functions.length}`)
		output.push(`FNH:${unique_functions.filter(f => f.hit > 0).length}`)

		for (const line of lines) output.push(`DA:${line.line},${line.hit}`)

		output.push(`LF:${lines.length}`)
		output.push(`LH:${lines.filter(l => l.hit > 0).length}`)

		output.push('end_of_record')
	}

	return output.join('\n') + '\n'
}
