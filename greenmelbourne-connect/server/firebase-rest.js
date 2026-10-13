import { Buffer } from 'node:buffer'
import { EmailError } from './email-handler.js'

// Works from a serverless runtime without exposing an Admin SDK private key.
// Firestore still applies the signed-in user's existing security rules.
export function firebaseRest({ projectId, apiKey, authOrigin = 'https://identitytoolkit.googleapis.com', firestoreOrigin = 'https://firestore.googleapis.com', fetcher = fetch }) {
  async function authenticate(token) {
    const response = await fetcher(`${authOrigin}/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new EmailError(response.status >= 500 ? 503 : 401, response.status >= 500 ? 'Account verification is temporarily unavailable.' : 'Please sign in again before sending an email.')
    const user = (await response.json()).users?.[0]
    if (!user || user.disabled) throw new EmailError(401, 'Please sign in again.')
    // accounts:lookup verifies the token; additionally bind it to this project.
    let claims
    try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) }
    catch { throw new EmailError(401, 'Please sign in again.') }
    if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` || claims.sub !== user.localId) throw new EmailError(401, 'This account belongs to a different project.')
    return { uid: user.localId, email: user.email }
  }
  async function read(collection, id, token) {
    const url = `${firestoreOrigin}/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`
    const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) })
    if (response.status === 404) return null
    if (!response.ok) throw new EmailError(response.status === 403 ? 403 : 503, 'The required account or registration could not be loaded.')
    const { fields } = await response.json()
    return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, value.stringValue]))
  }
  return { authenticate, getProfile: (uid, token) => read('gmcUsers', uid, token), getRegistration: (id, token) => read('gmcRegistrations', id, token) }
}
