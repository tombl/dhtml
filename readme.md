# `dhtml`

a post-component library for building user interfaces on the web.

```javascript
import { Root, html, invalidate } from 'https://tombl.github.io/dhtml/html.js'

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

Root.appendInto(document.body).render(app)
```
