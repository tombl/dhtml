import { createRoot } from 'dhtml'
import { App } from './app'

const root = createRoot(document.body)

// Use an IIFE to handle async initialization
;(async () => {
  let app = await App.create()
  root.render(app)

  if (import.meta.hot) {
    import.meta.hot.accept('./app', async module => {
      const { App } = module as unknown as typeof import('./app')
      app = await App.create()
      root.render(app)
    })
  }
})()
