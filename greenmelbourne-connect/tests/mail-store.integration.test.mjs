import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { createMailStore } from '../functions/mail-store.js'

const require = createRequire(new URL('../functions/package.json', import.meta.url))
const { initializeApp, deleteApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
let app, db
before(() => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8188') {
    throw new Error('Mail-store tests require the local Firestore emulator on 127.0.0.1:8188.')
  }
  app = initializeApp({ projectId: 'demo-greenmelbourne' }, 'mail-store-tests')
  db = getFirestore(app)
})
after(async () => { await app && deleteApp(app) })
const mail = { to: 'organiser@example.test', subject: 'Test activity', message: 'Private body', attachment: { content: 'private attachment' } }
const result = id => ({ status: 'accepted', to: mail.to, requestId: id })

test('concurrent duplicate requests get only one send reservation', async () => {
  const store = createMailStore(db), uid = randomUUID(), id = randomUUID()
  const results = await Promise.allSettled(Array.from({ length: 4 }, () => store.reserveSend(uid, id, mail)))
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1)
  assert(results.filter(value => value.status === 'rejected').every(value => value.reason.status === 409))
})
test('accepted result survives a new handler and rejects a changed replay', async () => {
  const store = createMailStore(db), uid = randomUUID(), id = randomUUID()
  const reservation = await store.reserveSend(uid, id, mail)
  await store.finishSend(reservation, result(id))
  const restarted = createMailStore(db)
  assert.deepEqual((await restarted.reserveSend(uid, id, mail)).result, result(id))
  await assert.rejects(restarted.reserveSend(uid, id, { ...mail, subject: 'Changed' }), error => error.status === 409)
  const saved = (await db.collection('gmcEmailRequests').doc(reservation.key).get()).data()
  assert(!JSON.stringify(saved).includes('Private body'))
  assert(!JSON.stringify(saved).includes('private attachment'))
})
test('uncertain send remains blocked after a restart', async () => {
  const store = createMailStore(db), uid = randomUUID(), id = randomUUID()
  const reservation = await store.reserveSend(uid, id, mail)
  await store.finishSend(reservation, null)
  await assert.rejects(createMailStore(db).reserveSend(uid, id, mail), error => error.status === 409)
})
test('late failure cannot overwrite confirmed provider acceptance', async () => {
  const store = createMailStore(db), uid = randomUUID(), id = randomUUID()
  const reservation = await store.reserveSend(uid, id, mail)
  await store.finishSend(reservation, result(id))
  await store.finishSend(reservation, null)
  assert.deepEqual((await store.reserveSend(uid, id, mail)).result, result(id))
})
test('hourly rate limit persists, separates users and expires after one hour', async () => {
  let time = 10000000
  const options = { now: () => time, hourlyLimit: 2 }
  const store = createMailStore(db, options), uid = randomUUID()
  await store.reserveSend(uid, randomUUID(), mail)
  await store.reserveSend(uid, randomUUID(), mail)
  await assert.rejects(createMailStore(db, options).reserveSend(uid, randomUUID(), mail), error => error.status === 429)
  await store.reserveSend(randomUUID(), randomUUID(), mail)
  time += 3600001
  await store.reserveSend(uid, randomUUID(), mail)
})
