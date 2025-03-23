# `dhtml`

a post-component library for building user interfaces on the web.

```javascript
import { html } from 'https://tombl.github.io/dhtml/dist/index.js'
import { createRoot, invalidate } from 'https://tombl.github.io/dhtml/dist/client.js'

const app = {
	i: 0,
	render() {
		return html`
			<button
				onclick=${() => {
					this.i++
					invalidate(this)
				}}
			>
				Count: ${this.i}
			</button>
		`
	},
}

createRoot(document.body).render(app)
```
