import { nextTick } from 'vue'

// Wait for Vue to render validation messages before moving keyboard focus.
export async function focusInvalid(form) {
  await nextTick()
  form?.querySelector('[aria-invalid="true"]')?.focus()
}
