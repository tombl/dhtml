import { assert, type Displayable } from '../shared.ts'
import { create_child_part_inner } from './parts.ts'
import { create_span_into, type Span } from './span.ts'

export interface Root {
	render(value: Displayable): void
}

export function createRoot(parent: Node): Root {
	const span = create_span_into(parent)
	return { render: create_child_part_inner(() => span) }
}

export function hydrate(parent: Node, value: Displayable): Root {
	assert(parent.firstChild && parent.lastChild)
	const span: Span = { _parent: parent, _start: parent.firstChild, _end: parent.lastChild }
	const render = create_child_part_inner(() => span)
	render(value)
	return { render }
}
