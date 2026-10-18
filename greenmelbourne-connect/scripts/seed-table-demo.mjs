// Disposable UI test data. All endpoints and the project ID are deliberately
// fixed to local emulators; this script cannot seed the production project.
import { readFileSync } from 'node:fs'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, writeBatch, Timestamp } from 'firebase/firestore'

const projectId = 'demo-greenmelbourne'
const email = 'table-demo@example.test'
const password = 'LocalTables2026!'
const app = initializeApp({ projectId, apiKey: 'demo-key', appId: 'table-demo' }, 'table-demo-seed')
const auth = getAuth(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
let env
try {
  let account
  try { account = await createUserWithEmailAndPassword(auth, email, password) }
  catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error
    account = await signInWithEmailAndPassword(auth, email, password)
  }
  env = await initializeTestEnvironment({ projectId, firestore: {
    host: '127.0.0.1', port: 8188, rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  } })
  // Reset disposable LOCAL data so other emulator tests cannot affect the UI fixture.
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'gmcUsers', account.user.uid), { fullName: 'Table Demo Organiser', email, role: 'organiser', createdAt: Timestamp.now() })
    for (let index = 1; index <= 23; index++) {
      const suffix = String(index).padStart(2, '0')
      const eventId = `table-demo-event-${suffix}`
      const title = `Community activity ${suffix}`
      const suburb = index % 2 ? 'Clayton' : 'Box Hill'
      batch.set(doc(db, 'gmcEvents', eventId), {
        title, suburb, date: `${suffix} November 2026`,
        type: index % 3 ? 'Tree planting' : 'Workshop', places: index + 1,
        description: 'Local emulator sample activity for testing interactive tables.',
      })
      batch.set(doc(db, 'gmcRegistrations', `table-demo-registration-${suffix}`), {
        userId: account.user.uid, eventId, eventTitle: title, fullName: `Volunteer ${suffix}`,
        email: `volunteer-${suffix}@example.test`, suburb,
        reason: `Sample registration ${suffix} for local table testing only.`,
        status: index % 2 ? 'Waiting' : 'Contacted',
        createdAt: Timestamp.fromMillis(Date.UTC(2026, 9, index, 10)),
      })
    }
    await batch.commit()
  })
  console.log('Seeded 23 activities and 23 registrations in LOCAL emulators only.')
  console.log(`Demo organiser: ${email} / ${password}`)
} finally {
  await env?.cleanup()
  await signOut(auth)
  await deleteApp(app)
}
