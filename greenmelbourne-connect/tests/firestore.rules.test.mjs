import { readFileSync } from 'node:fs'
import { before, after, beforeEach, test } from 'node:test'
import { strict as assert } from 'node:assert'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, collection, query, where, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
let env
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-greenmelbourne', firestore: {
    host: '127.0.0.1', port: 8188, rules: readFileSync('firestore.rules', 'utf8'),
  } })
})
after(async () => { await env?.cleanup() })
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await Promise.all([
      setDoc(doc(db, 'gmcUsers', 'alice'), { fullName: 'Alice Member', email: 'alice@example.com', role: 'member' }),
      setDoc(doc(db, 'gmcUsers', 'bob'), { fullName: 'Bob Member', email: 'bob@example.com', role: 'member' }),
      setDoc(doc(db, 'gmcUsers', 'admin'), { fullName: 'Organiser', email: 'admin@example.com', role: 'organiser' }),
      setDoc(doc(db, 'gmcEvents', '1'), { title: 'Tree planting', suburb: 'Clayton' }),
      setDoc(doc(db, 'gmcRegistrations', 'alice-registration'), { userId: 'alice', email: 'alice@example.com', status: 'Waiting' }),
    ])
  })
})
const dbFor = (uid) => env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore()
const newRegistration = (extra = {}) => ({ userId: 'alice', eventId: '1', eventTitle: 'Tree planting', fullName: 'Alice Member', email: 'alice@example.com', suburb: 'Clayton', reason: 'I want to help plant native trees.', status: 'Waiting', createdAt: serverTimestamp(), ...extra })
const newRating = (extra = {}) => ({ userId: 'alice', eventId: '1', score: 5, reviewerName: 'Alice Member', comment: 'A useful community planting day.', submittedAt: '10/10/2026', updatedAt: serverTimestamp(), ...extra })
test('visitors can read activities but not private profiles or registrations', async () => {
  const db = env.unauthenticatedContext().firestore()
  await assertSucceeds(getDocs(collection(db, 'gmcEvents')))
  await assertFails(getDoc(doc(db, 'gmcUsers', 'alice')))
  await assertFails(getDocs(collection(db, 'gmcRegistrations')))
  await assertFails(setDoc(doc(db, 'gmcRegistrations', 'new'), newRegistration()))
})
test('new users can create only their own member profile', async () => {
  const db = dbFor('new')
  const profile = { fullName: 'New Member', email: 'new@example.com', role: 'member', createdAt: serverTimestamp() }
  await assertFails(setDoc(doc(db, 'gmcUsers', 'new'), { ...profile, role: 'organiser' }))
  await assertFails(setDoc(doc(db, 'gmcUsers', 'someone-else'), profile))
  await assertSucceeds(setDoc(doc(db, 'gmcUsers', 'new'), profile))
})
test('members cannot promote themselves or tamper with protected profile fields', async () => {
  const db = dbFor('alice'), reference = doc(db, 'gmcUsers', 'alice')
  await assertFails(updateDoc(reference, { role: 'organiser' }))
  await assertFails(updateDoc(reference, { email: 'bob@example.com' }))
  await assertFails(updateDoc(reference, { admin: true }))
  await assertSucceeds(updateDoc(reference, { fullName: 'Alice Updated' }))
})
test('members can read only their own registrations, including filtered queries', async () => {
  const db = dbFor('alice')
  await assertSucceeds(getDoc(doc(db, 'gmcRegistrations', 'alice-registration')))
  await assertSucceeds(getDocs(query(collection(db, 'gmcRegistrations'), where('userId', '==', 'alice'))))
  await assertFails(getDocs(collection(db, 'gmcRegistrations')))
  await assertFails(getDoc(doc(dbFor('bob'), 'gmcRegistrations', 'alice-registration')))
})
test('registration saves to Firestore and rejects impersonation, fabricated events and invalid input', async () => {
  const db = dbFor('alice'), reference = doc(db, 'gmcRegistrations', 'new')
  for (const extra of [{ userId: 'bob' }, { email: 'bob@example.com' }, { status: 'Contacted' }, { eventId: 'missing' }, { eventTitle: 'Fake title' }, { reason: 'short' }, { extra: true }]) {
    await assertFails(setDoc(reference, newRegistration(extra)))
  }
  await assertSucceeds(setDoc(reference, newRegistration()))
  const saved = await getDoc(reference)
  assert.equal(saved.data().reason, 'I want to help plant native trees.')
})
test('only organisers can manage registrations, and they cannot rewrite the member data', async () => {
  const member = doc(dbFor('alice'), 'gmcRegistrations', 'alice-registration')
  await assertFails(updateDoc(member, { status: 'Contacted' }))
  await assertFails(deleteDoc(member))
  const db = dbFor('admin'), reference = doc(db, 'gmcRegistrations', 'alice-registration')
  await assertSucceeds(getDocs(collection(db, 'gmcRegistrations')))
  await assertSucceeds(updateDoc(reference, { status: 'Contacted' }))
  await assertFails(updateDoc(reference, { email: 'changed@example.com' }))
  await assertSucceeds(deleteDoc(reference))
})
test('ratings are public, one per member per activity, and validate score and author', async () => {
  const db = dbFor('alice'), reference = doc(db, 'gmcRatings', '1_alice')
  for (const extra of [{ score: 6 }, { score: 1.5 }, { comment: 'short' }, { reviewerName: 'Bob Member' }, { userId: 'bob' }, { eventId: 'missing' }]) {
    await assertFails(setDoc(reference, newRating(extra)))
  }
  await assertFails(setDoc(doc(db, 'gmcRatings', 'duplicate'), newRating()))
  await assertSucceeds(setDoc(reference, newRating()))
  await assertSucceeds(setDoc(reference, newRating({ score: 4 })))
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'gmcRatings', '1_alice')))
  await assertFails(updateDoc(doc(dbFor('bob'), 'gmcRatings', '1_alice'), { score: 1 }))
})
test('members cannot alter activities or access unrelated collections', async () => {
  await assertFails(updateDoc(doc(dbFor('alice'), 'gmcEvents', '1'), { title: 'Changed' }))
  await assertSucceeds(updateDoc(doc(dbFor('admin'), 'gmcEvents', '1'), { title: 'Updated activity' }))
  await assertFails(getDocs(collection(dbFor('admin'), 'otherPrivateData')))
  // Email ledger and rate limits may only be accessed by the cloud function.
  for (const collectionName of ['gmcEmailRequests', 'gmcEmailLimits']) {
    await assertFails(getDocs(collection(dbFor('admin'), collectionName)))
    await assertFails(setDoc(doc(dbFor('admin'), collectionName, 'fake'), { status: 'accepted' }))
  }
})
