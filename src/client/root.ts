import type { Displayable } from '../shared.ts'
import { create_child_part_inner } from './parts.ts'
import { create_span_into } from './span.ts'

export interface Root {
	render(value: Displayable): void
}

export function createRoot(parent: Node): Root {
	return { render: create_child_part_inner(() => create_span_into(parent)) }
}
