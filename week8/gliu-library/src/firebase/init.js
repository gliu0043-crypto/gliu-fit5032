import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'fit5032-9edfc.firebaseapp.com',
  projectId: 'fit5032-9edfc',
  appId: '1:000000000000:web:week7-firebase-auth',
}

const firebaseApp = initializeApp(firebaseConfig)
const auth = getAuth(firebaseApp)
const db = getFirestore(firebaseApp)

const emulatorHosts = ['localhost', '127.0.0.1']

if (import.meta.env.DEV && emulatorHosts.includes(window.location.hostname)) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    })
  } catch (error) {
    if (!String(error.message).includes('already been called')) {
      throw error
    }
  }

  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  } catch (error) {
    const message = String(error.message)
    if (
      !message.includes('already been called') &&
      !message.includes('settings can no longer be changed')
    ) {
      throw error
    }
  }
}

export { auth, db, firebaseApp }
export default db
