import {
  createBrowserRouter,
  type BrowserRouter,
  type RouterConfig as BrowserRouterConfig,
} from '@tombl/router/browser'
import type { Params } from '@tombl/router/matcher'
import { html, invalidate, onMount, type Displayable } from 'dhtml'

type PageClass<Path extends string, Context> = new (ctx: Context, params: Params<Path>) => Displayable
type PageFunction<Path extends string, Context> = (ctx: Context, params: Params<Path>) => Displayable

type PageHandler<Path extends string, Context> = () => Promise<{
  default: PageClass<Path, Context> | PageFunction<Path, Context>
}>

interface RouterConfig<Context> {
  routes: Record<string, PageHandler<string, Context>>
  context: Context
}
interface RouterConfigP<Context, Routes extends { [Path in keyof Routes & string]: PageHandler<Path, Context> }>
  extends RouterConfig<Context> {
  routes: Routes
}

export class Router<Context, Routes extends { [Path in keyof Routes & string]: PageHandler<Path, Context> }> {
  #page: Displayable
  #router: BrowserRouter

  constructor(config: RouterConfigP<Context, Routes>) {
    const routes: BrowserRouterConfig['routes'] = {}

    for (const [pathname, importPageModule] of Object.entries((config as RouterConfig<Context>).routes)) {
      routes[pathname] = async params => {
        const module = await importPageModule()
        const page =
          'prototype' in module.default
            ? new (module.default as PageClass<string, Context>)(config.context, params)
            : (module.default as PageFunction<string, Context>)(config.context, params)
        this.#page = page
        invalidate(this)
      }
    }

    this.#router = createBrowserRouter({
      routes,
      notFound: pathname => {
        this.#page = html`<p>not found: <code>${pathname}</code></p>`
        invalidate(this)
      },
    })

    onMount(this, () => {
      this.#router.start()
      return () => {
        this.#router.stop()
      }
    })
  }

  navigate(pathname: string) {
    this.#router.navigate(pathname)
  }

  redirect(pathname: string) {
    this.#router.redirect(pathname)
  }

  render() {
    return this.#page
  }
}
