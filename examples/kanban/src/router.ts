import { createBrowserRouter, type RouterConfig } from '@tombl/router/browser'
import type { Params } from '@tombl/router/matcher'
import { invalidate, onMount, type Displayable, type Renderable } from 'dhtml'

interface Page<Path extends string> {
	new (params: Params<Path>): Renderable
}

type PageHandler<Path extends string> = () => Promise<{ default: Page<Path> }>

export class Router<Routes extends { [Path in keyof Routes & string]: PageHandler<Path> }> {
	#page: Displayable

	constructor(routes: Routes) {
		const routerConfig: RouterConfig['routes'] = {}

		for (const [pathname, importPageModule] of Object.entries(routes as Record<string, PageHandler<string>>)) {
			routerConfig[pathname] = async params => {
				const module = await importPageModule()
				this.#page = new module.default(params)
				invalidate(this)
			}
		}

		const router = createBrowserRouter({ routes: routerConfig })

		onMount(this, () => {
			router.start()
			return () => {
				router.stop()
			}
		})
	}

	render() {
		return this.#page
	}
}
