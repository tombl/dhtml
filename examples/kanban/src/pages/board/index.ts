import type { PageContext } from '~/app'
import { Board } from './board'
import type { ID } from '~/db'

export default function Page(context: PageContext, params: { id: string }) {
	return new Board(context.app, parseInt(params.id) as ID)
}
