import { html, attr } from 'dhtml'

export function text({ value, onSubmit }: { value: string; onSubmit: (value: string) => void }) {
  return html`
    <form
      style="display: contents"
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
        style="background: none; border: none"
        type="text"
        name="title"
        ${attr('value', value)}
        onblur=${async (e: FocusEvent) => {
          const input = e.target as HTMLInputElement

          // wait a tick to let the parent be removed
          await Promise.resolve()

          // don't submit if the blur is because we're removing the card
            if (input.isConnected) {
              input.form!.requestSubmit()
            }
        }}
      />
    </form>
  `
}
