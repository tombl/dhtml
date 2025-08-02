// @ts-check
/// <reference types='./uibench.d.ts' />

import { html, keyed } from 'dhtml'
import { createRoot } from 'dhtml/client'

/** @param {string} text */
function tableCell(text) {
	function onClick(e) {
		console.log('Clicked' + text)
		e.stopPropagation()
	}
	return html`<td class="TableCell" onclick=${onClick}>${text}</td>`
}

/** @param {TableItemState} data */
function tableRow(data) {
	return html`
		<tr class=${data.active ? 'TableRow active' : 'TableRow'} data-id=${data.id}>
			${tableCell('#' + data.id)} ${data.props.map(c => tableCell(c))}
		</tr>
	`
}

/** @param {TableState} data */
function table(data) {
	return html`
		<table class="Table">
			<tbody>
				${data.items.map(item => keyed(tableRow(item), item.id))}
			</tbody>
		</table>
	`
}

/** @param {AnimBoxState} data */
function animBox(data) {
	return html`
		<div
			class="AnimBox"
			data-id=${data.id}
			style=${`
				border-radius: ${data.time % 10}px;
				background: rgba(0,0,0,${0.5 + (data.time % 10) / 10});
			`}
		></div>
	`
}

/** @param {AnimState} data */
function anim(data) {
	return html`<div class="Anim">${data.items.map(item => keyed(animBox(item), item.id))}</div>`
}

/** @param {TreeNodeState} data */
function treeLeaf(data) {
	return html`<li class="TreeLeaf">${data.id}</li>`
}

/** @param {TreeNodeState} data */
function treeNode(data) {
	return html`
		<ul class="TreeNode">
			${data.children.map(child => keyed(child.container ? treeNode(child) : treeLeaf(child), child.id))}
		</ul>
	`
}

/** @param {TreeState} data */
function tree(data) {
	return html`<div class="Tree">${treeNode(data.root)}</div>`
}

/** @param {AppState} data */
function main(data) {
	let section
	switch (data.location) {
		case 'table':
			section = table(data.table)
			break
		case 'anim':
			section = anim(data.anim)
			break
		case 'tree':
			section = tree(data.tree)
			break
	}

	return html`<div class="Main">${section}</div>`
}

const root = createRoot(document.body)

uibench.init('dhtml', 'HEAD')
uibench.run(
	state => {
		root.render(main(state))
	},
	samples => {
		root.render(html`<pre>${JSON.stringify(samples, null, ' ')}</pre>`)
	},
)
