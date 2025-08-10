import type { PageContext } from '#app'
import type { ID } from '#db'
import { Board } from './board'

export default function Page(context: PageContext, params: { id: string }) {
	return new Board(context.app, parseInt(params.id) as ID)
}
