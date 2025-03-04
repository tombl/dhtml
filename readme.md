# `dhtml`

a post-component library for building user interfaces on the web.

```javascript
import { createRoot, html, invalidate } from 'https://tombl.github.io/dhtml/src/html.js'

const app = {
	i: 0,
	render() {
		return html`
			<button
				@click=${() => {
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
