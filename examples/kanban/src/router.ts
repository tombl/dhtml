import { createBrowserRouter, type RouterConfig as BrowserRouterConfig } from '@tombl/router/browser'
import type { Params } from '@tombl/router/matcher'
import { html, invalidate, onMount, type Displayable, type Renderable } from 'dhtml'

interface PageClass<Path extends string, Context> {
  new (ctx: Context, params: Params<Path>): Renderable
}

type PageHandler<Path extends string, Context> = () => Promise<{ default: PageClass<Path, Context> }>

interface RouterConfig<Context> {
  routes: Record<string, PageHandler<string, Context>>
  context: Context
}
interface RouterConfigP<Context, Routes extends { [Path in keyof Routes & string]: PageHandler<Path, Context> }>
  extends RouterConfig<Context> {
  routes: Routes
}

export class Router<Context, Routes extends { [Path in keyof Routes & string]: PageHandler<Path, Context> }> {
  #page: Displayable = html`loading...`

  constructor(config: RouterConfigP<Context, Routes>) {
    const routerConfig: BrowserRouterConfig['routes'] = {}

    for (const [pathname, importPageModule] of Object.entries((config as RouterConfig<Context>).routes)) {
      routerConfig[pathname] = async params => {
        const module = await importPageModule()
        const page = new module.default(config.context, params)
        this.#page = page
        invalidate(this)
      }
    }

    const router = createBrowserRouter({
      routes: routerConfig,
      notFound: pathname => {
        this.#page = html`<p>not found: <code>${pathname}</code></p>`
        invalidate(this)
      },
    })

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
