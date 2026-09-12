export const cleanText = (value) =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const cleanLongText = (value) =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .trim()

export const cleanEmail = (value) => cleanText(value).toLowerCase()

export const safeRegistrationStatus = (status) =>
  status === 'Contacted' ? 'Contacted' : 'Waiting'

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

export const hashPassword = async (password) => {
  const passwordText = String(password ?? '')

  if (globalThis.crypto?.subtle) {
    const encodedPassword = new TextEncoder().encode(passwordText)
    const hashedPassword = await globalThis.crypto.subtle.digest('SHA-256', encodedPassword)
    return toHex(hashedPassword)
  }

  return btoa(passwordText)
}
