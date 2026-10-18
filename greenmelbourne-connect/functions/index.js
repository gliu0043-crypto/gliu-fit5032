import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { defineJsonSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { createEmailDelivery, createEmailHandler, EmailError } from './server/email-handler.js'
import { createMailStore } from './mail-store.js'

initializeApp()
const emailConfig = defineJsonSecret('GMC_EMAIL_CONFIG')
const db = getFirestore()
const allowedOrigins = [
  'https://greenmelbourne-connect-801602918282.web.app',
  'https://greenmelbourne-connect-801602918282.firebaseapp.com',
]

export const gmcSendActivityEmail = onRequest({
  region: 'australia-southeast1',
  memory: '256MiB', timeoutSeconds: 360,
  minInstances: 0, maxInstances: 1, cpu: 'gcf_gen1', concurrency: 1,
  secrets: [emailConfig], cors: false,
}, async (req, res) => {
  const handler = createEmailHandler({
    allowedOrigins,
    authenticate: async token => {
      try { return await getAuth().verifyIdToken(token, true) }
      catch { throw new EmailError(401, 'Please sign in again.') }
    },
    getProfile: async uid => (await db.collection('gmcUsers').doc(uid).get()).data(),
    getRegistration: async id => (await db.collection('gmcRegistrations').doc(id).get()).data(),
    ...createMailStore(db),
    deliver: mail => createEmailDelivery(emailConfig.value())(mail),
  })
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }
  const request = new Request('https://email.greenmelbourne.invalid/send', {
    method: req.method, headers,
    ...(!['GET', 'HEAD'].includes(req.method) ? { body: req.rawBody } : {}),
  })
  const response = await handler(request)
  response.headers.forEach((value, name) => res.setHeader(name, value))
  res.status(response.status).send(Buffer.from(await response.arrayBuffer()))
})
