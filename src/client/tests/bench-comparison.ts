import { setup } from './setup.ts'

export function get_benchmarks({
	index: { html },
	client: { invalidate },
}: {
	index: { html: any }
	client: { invalidate: any }
}) {
	// ==============================
	// Data Structures
	// ==============================

	class TableState {
		items: TableItemState[]

		constructor(rows: number, cols: number) {
			this.items = []
			for (let i = 0; i < rows; i++) {
				const props: string[] = []
				for (let j = 0; j < cols; j++) {
					props.push(`${i}:${j}`)
				}
				this.items.push(new TableItemState(i, false, props))
			}
		}

		remove_all() {
			this.items = []
		}

		sort_by_column(col: number) {
			this.items.sort((a, b) => a.props[col].localeCompare(b.props[col]))
		}

		filter(nth: number) {
			this.items = this.items.filter((_, i) => (i + 1) % nth !== 0)
		}

		activate(nth: number) {
			for (let i = 0; i < this.items.length; i++) {
				this.items[i].active = (i + 1) % nth === 0
				invalidate(this.items[i])
			}
		}

		render() {
			return html`
				<table class="Table">
					<tbody>
						${this.items}
					</tbody>
				</table>
			`
		}
	}

	class TableItemState {
		id: number
		active: boolean
		props: string[]

		constructor(id: number, active: boolean, props: string[]) {
			this.id = id
			this.active = active
			this.props = props
		}

		render() {
			function cell(text: string) {
				return html`<td
					class="TableCell"
					onclick=${(e: Event) => {
						console.log('Clicked' + text)
						e.stopPropagation()
					}}
				>
					${text}
				</td>`
			}

			return html`
				<tr class=${this.active ? 'TableRow active' : 'TableRow'} data-id=${this.id}>
					${cell('#' + this.id)} ${this.props.map(prop => cell(prop))}
				</tr>
			`
		}
	}

	// ==============================
	// Animation Data Structures
	// ==============================

	class AnimState {
		items: AnimBoxState[]

		constructor(count: number) {
			this.items = []
			for (let i = 0; i < count; i++) {
				this.items.push(new AnimBoxState(i, 0))
			}
		}

		advance_each(nth: number) {
			for (let i = 0; i < this.items.length; i++) {
				if ((i + 1) % nth === 0) {
					this.items[i].time++
					invalidate(this.items[i])
				}
			}
		}

		render() {
			return html`<div class="Anim">${this.items}</div>`
		}
	}

	class AnimBoxState {
		id: number
		time: number

		constructor(id: number, time: number) {
			this.id = id
			this.time = time
		}

		render() {
			return html`
				<div
					class="AnimBox"
					data-id=${this.id}
					style=${`
			  border-radius: ${this.time % 10}px;
			  background: rgba(0,0,0,${0.5 + (this.time % 10) / 10});
			`}
				></div>
			`
		}
	}

	// ==============================
	// Tree Data Structures
	// ==============================

	class TreeState {
		root: TreeNodeState

		constructor(hierarchy: number[]) {
			let id_counter = 0
			function create_node(depth: number, max_depth: number): TreeNodeState {
				const id = id_counter++

				if (depth === max_depth) {
					return new TreeNodeState(id, false, null)
				}

				const children: TreeNodeState[] = []
				const child_count = hierarchy[depth]

				for (let i = 0; i < child_count; i++) {
					children.push(create_node(depth + 1, max_depth))
				}

				return new TreeNodeState(id, true, children)
			}

			this.root = create_node(0, hierarchy.length - 1)
		}

		remove_all() {
			this.root.children = []
		}

		reverse() {
			const reverse_children = (node: TreeNodeState) => {
				if (node.container && node.children) {
					node.children.reverse()
					for (const child of node.children) {
						if (child.container) {
							reverse_children(child)
						}
					}
					invalidate(node)
				}
			}

			reverse_children(this.root)
		}

		insert_first(n: number) {
			function insert_at_containers(node: TreeNodeState, id_counter: { value: number }) {
				if (node.container && node.children) {
					const new_nodes: TreeNodeState[] = []
					for (let i = 0; i < n; i++) {
						new_nodes.push(new TreeNodeState(id_counter.value++, false, null))
					}
					node.children.unshift(...new_nodes)

					for (const child of node.children) {
						if (child.container) {
							insert_at_containers(child, id_counter)
						}
					}
					invalidate(node)
				}
			}

			// Find the highest ID to start creating new IDs from
			let max_id = 0
			const find_max_id = (node: TreeNodeState) => {
				max_id = Math.max(max_id, node.id)
				if (node.container && node.children) {
					for (const child of node.children) {
						find_max_id(child)
					}
				}
			}

			find_max_id(this.root)
			const id_counter = { value: max_id + 1 }

			insert_at_containers(this.root, id_counter)
		}

		insert_last(n: number) {
			function insert_at_containers(node: TreeNodeState, id_counter: { value: number }) {
				if (node.container && node.children) {
					const new_nodes: TreeNodeState[] = []
					for (let i = 0; i < n; i++) {
						new_nodes.push(new TreeNodeState(id_counter.value++, false, null))
					}
					node.children.push(...new_nodes)

					for (const child of node.children) {
						if (child.container) {
							insert_at_containers(child, id_counter)
						}
					}
					invalidate(node)
				}
			}

			// Find the highest ID to start creating new IDs from
			let max_id = 0
			const find_max_id = (node: TreeNodeState) => {
				max_id = Math.max(max_id, node.id)
				if (node.container && node.children) {
					for (const child of node.children) {
						find_max_id(child)
					}
				}
			}

			find_max_id(this.root)
			const id_counter = { value: max_id + 1 }

			insert_at_containers(this.root, id_counter)
		}

		remove_first(n: number) {
			const remove_from_containers = (node: TreeNodeState) => {
				if (node.container && node.children) {
					node.children.splice(0, Math.min(n, node.children.length))

					for (const child of node.children) {
						if (child.container) {
							remove_from_containers(child)
						}
					}

					invalidate(node)
				}
			}

			remove_from_containers(this.root)
		}

		remove_last(n: number) {
			const remove_from_containers = (node: TreeNodeState) => {
				if (node.container && node.children) {
					const length = node.children.length
					node.children.splice(Math.max(0, length - n), Math.min(n, length))

					for (const child of node.children) {
						if (child.container) {
							remove_from_containers(child)
						}
					}

					invalidate(node)
				}
			}

			remove_from_containers(this.root)
		}

		move_from_end_to_start(n: number) {
			const move_in_containers = (node: TreeNodeState) => {
				if (node.container && node.children && node.children.length > n) {
					const length = node.children.length
					const moved = node.children.splice(length - n, n)
					node.children.unshift(...moved)

					for (const child of node.children) {
						if (child.container) {
							move_in_containers(child)
						}
					}

					invalidate(node)
				}
			}

			move_in_containers(this.root)
		}

		move_from_start_to_end(n: number) {
			const move_in_containers = (node: TreeNodeState) => {
				if (node.container && node.children && node.children.length > n) {
					const moved = node.children.splice(0, n)
					node.children.push(...moved)

					for (const child of node.children) {
						if (child.container) {
							move_in_containers(child)
						}
					}

					invalidate(node)
				}
			}

			move_in_containers(this.root)
		}

		// Worst case scenarios
		kivi_worst_case() {
			this.remove_first(1)
			this.remove_last(1)
			this.reverse()
		}

		snabbdom_worst_case() {
			const transform = (node: TreeNodeState) => {
				if (node.container && node.children && node.children.length > 2) {
					const first = node.children.shift()
					if (first) {
						const secondToLast = node.children.splice(node.children.length - 2, 1)[0]
						node.children.push(first, secondToLast)
					}

					for (const child of node.children) {
						if (child.container) {
							transform(child)
						}
					}

					invalidate(node)
				}
			}

			transform(this.root)
		}

		react_worst_case() {
			this.remove_first(1)
			this.remove_last(1)
			this.move_from_end_to_start(1)
		}

		virtual_dom_worst_case() {
			this.move_from_start_to_end(2)
		}

		render() {
			return html`<div class="Tree">${this.root}</div>`
		}
	}

	class TreeNodeState {
		id: number
		container: boolean
		children: TreeNodeState[] | null

		constructor(id: number, container: boolean, children: TreeNodeState[] | null) {
			this.id = id
			this.container = container
			this.children = children
		}

		render() {
			if (!this.container) {
				return html`<li class="TreeLeaf">${this.id}</li>`
			}

			return html`
				<ul class="TreeNode">
					${this.children}
				</ul>
			`
		}
	}

	// ==============================
	// Benchmark Functions
	// ==============================

	function bench_table_small_render() {
		const { root } = setup()
		const state = new TableState(15, 4)
		root.render(state)
	}

	function bench_table_small_removeAll() {
		const { root } = setup()
		const state = new TableState(15, 4)
		root.render(state)
		state.remove_all()
		invalidate(state)
	}

	function bench_table_small_sort() {
		const { root } = setup()
		const state = new TableState(15, 4)
		root.render(state)
		state.sort_by_column(1)
		invalidate(state)
	}

	function bench_table_small_filter() {
		const { root } = setup()
		const state = new TableState(15, 4)
		root.render(state)
		state.filter(4)
		invalidate(state)
	}

	function bench_table_small_activate() {
		const { root } = setup()
		const state = new TableState(15, 4)
		root.render(state)
		state.activate(4)
		invalidate(state)
	}

	function bench_table_large_render() {
		const { root } = setup()
		const state = new TableState(100, 4)
		root.render(state)
	}

	function bench_table_large_removeAll() {
		const { root } = setup()
		const state = new TableState(100, 4)
		root.render(state)
		state.remove_all()
		invalidate(state)
	}

	function bench_table_large_sort() {
		const { root } = setup()
		const state = new TableState(100, 4)
		root.render(state)
		state.sort_by_column(1)
		invalidate(state)
	}

	function bench_table_large_filter() {
		const { root } = setup()
		const state = new TableState(100, 4)
		root.render(state)
		state.filter(16)
		invalidate(state)
	}

	function bench_table_large_activate() {
		const { root } = setup()
		const state = new TableState(100, 4)
		root.render(state)
		state.activate(16)
		invalidate(state)
	}

	function bench_anim_small_advance() {
		const { root } = setup()
		const state = new AnimState(30)
		root.render(state)
		state.advance_each(4)
		invalidate(state)
	}

	function bench_anim_large_advance() {
		const { root } = setup()
		const state = new AnimState(100)
		root.render(state)
		state.advance_each(16)
		invalidate(state)
	}

	function bench_tree_small_render() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
	}

	function bench_tree_small_removeAll() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.remove_all()
		invalidate(state)
	}

	function bench_tree_small_reverse() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.reverse()
		invalidate(state)
	}

	function bench_tree_small_insertFirst() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.insert_first(2)
		invalidate(state)
	}

	function bench_tree_small_insertLast() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.insert_last(2)
		invalidate(state)
	}

	function bench_tree_small_removeFirst() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.remove_first(2)
		invalidate(state)
	}

	function bench_tree_small_removeLast() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.remove_last(2)
		invalidate(state)
	}

	function bench_tree_small_moveFromEndToStart() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.move_from_end_to_start(2)
		invalidate(state)
	}

	function bench_tree_small_moveFromStartToEnd() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		state.move_from_start_to_end(2)
		invalidate(state)
	}

	function bench_tree_small_no_change() {
		const { root } = setup()
		const state = new TreeState([5, 10])
		root.render(state)
		invalidate(state)
	}

	function bench_tree_large_render() {
		const { root } = setup()
		const state = new TreeState([50, 10])
		root.render(state)
	}

	function bench_tree_large_removeAll() {
		const { root } = setup()
		const state = new TreeState([50, 10])
		root.render(state)
		state.remove_all()
		invalidate(state)
	}

	function bench_tree_large_reverse() {
		const { root } = setup()
		const state = new TreeState([50, 10])
		root.render(state)
		state.reverse()
		invalidate(state)
	}

	function bench_tree_worst_case_kivi() {
		const { root } = setup()
		const state = new TreeState([10, 10])
		root.render(state)
		state.kivi_worst_case()
		invalidate(state)
	}

	function bench_tree_worst_case_snabbdom() {
		const { root } = setup()
		const state = new TreeState([10, 10])
		root.render(state)
		state.snabbdom_worst_case()
		invalidate(state)
	}

	function bench_tree_worst_case_react() {
		const { root } = setup()
		const state = new TreeState([10, 10])
		root.render(state)
		state.react_worst_case()
		invalidate(state)
	}

	function bench_tree_worst_case_virtual_dom() {
		const { root } = setup()
		const state = new TreeState([10, 10])
		root.render(state)
		state.virtual_dom_worst_case()
		invalidate(state)
	}

	return {
		bench_table_small_render,
		bench_table_small_removeAll,
		bench_table_small_sort,
		bench_table_small_filter,
		bench_table_small_activate,
		bench_table_large_render,
		bench_table_large_removeAll,
		bench_table_large_sort,
		bench_table_large_filter,
		bench_table_large_activate,
		bench_anim_small_advance,
		bench_anim_large_advance,
		bench_tree_small_render,
		bench_tree_small_removeAll,
		bench_tree_small_reverse,
		bench_tree_small_insertFirst,
		bench_tree_small_insertLast,
		bench_tree_small_removeFirst,
		bench_tree_small_removeLast,
		bench_tree_small_moveFromEndToStart,
		bench_tree_small_moveFromStartToEnd,
		bench_tree_small_no_change,
		bench_tree_large_render,
		bench_tree_large_removeAll,
		bench_tree_large_reverse,
		bench_tree_worst_case_kivi,
		bench_tree_worst_case_snabbdom,
		bench_tree_worst_case_react,
		bench_tree_worst_case_virtual_dom,
	}
}
