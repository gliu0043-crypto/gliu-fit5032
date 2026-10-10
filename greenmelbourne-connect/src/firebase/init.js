import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const emulator = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
if (emulator && import.meta.env.PROD) throw new Error('Emulators must not be used in production.')
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
if (emulator) Object.assign(config, {
  apiKey: 'demo-key', authDomain: 'demo-greenmelbourne.firebaseapp.com',
  projectId: 'demo-greenmelbourne', appId: 'demo-greenmelbourne-web',
})
export const firebaseConfigured = Object.values(config).every(Boolean)
const app = firebaseConfigured ? initializeApp(config) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
if (emulator && app) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8188)
}
export function requireDatabase() {
  if (!db) throw new Error('The service is not configured yet. Please try again later.')
  return db
}
