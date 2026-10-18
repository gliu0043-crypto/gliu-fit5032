import { auth } from '../firebase/init'

const endpoint = import.meta.env.VITE_EMAIL_ENDPOINT || ''
export const emailConfigured = Boolean(endpoint)

export function readAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The file could not be read. Please select it again.'))
    reader.onload = () => resolve({ name: file.name, size: file.size, content: String(reader.result).split(',')[1] })
    reader.readAsDataURL(file)
  })
}

export async function sendActivityEmail(payload) {
  if (!auth?.currentUser) throw new Error('Please sign in again before sending an email.')
  if (!emailConfigured) throw new Error('Email sending is currently unavailable. Please try again later.')
  const token = await auth.currentUser.getIdToken()
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(payload.recipients ? 390000 : 30000),
    })
  } catch {
    throw new Error('The send result could not be confirmed. Check the recipient inbox before trying again to avoid duplicate emails.')
  }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The email could not be sent. Please try again later.')
  if (result.status !== 'accepted' && result.status !== 'simulated' && !(result.status === 'batch-complete' && Array.isArray(result.results))) {
    throw new Error('The send result could not be confirmed. Check the recipient inbox before trying again.')
  }
  return result
}
