import '../../../reset.css'

import { createRoot } from 'dhtml'
import { App } from './app'

const root = createRoot(document.body)

let app = await App.create()
root.render(app)

if (import.meta.hot) {
	import.meta.hot.accept('./app', async module => {
		const { App } = module as unknown as typeof import('./app')
		app = await App.create()
		root.render(app)
	})
}
