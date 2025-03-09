import { html, attr } from 'dhtml'

export function text({ value, onSubmit }: { value: string; onSubmit: (value: string) => void }) {
  return html`
    <form
      style="display: inline"
      onsubmit=${(e: SubmitEvent) => {
        e.preventDefault()
        const form = e.currentTarget as HTMLFormElement
        const formData = new FormData(form)
        const title = String(formData.get('title'))

        if (title === value) return

        onSubmit(title)
      }}
    >
      <input
        type="text"
        name="title"
        ${attr('value', value)}
        onblur=${(e: FocusEvent) => {
          const input = e.target as HTMLInputElement
          input.form!.requestSubmit()
        }}
      />
    </form>
  `
}
