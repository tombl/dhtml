import type { PageContext } from '~/app'
import { Board } from './board'

export default function Page(context: PageContext, params: { id: string }) {
  return new Board(context.app, parseInt(params.id))
}
