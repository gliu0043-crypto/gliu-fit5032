import { createHash } from 'node:crypto'
import { EmailError } from './server/email-handler.js'

const hash = value => createHash('sha256').update(value).digest('hex')

// These collections are server-only under the existing Firestore deny rule.
// Store hashes and outcomes, never the message body, file, token or API key.
export function createMailStore(db, { now = Date.now, hourlyLimit = 20 } = {}) {
  return {
    async reserveBatch(uid, requestId, batch) {
      const reference = db.collection('gmcEmailBatches').doc(hash(`${uid}:${requestId}`))
      const fingerprint = hash(JSON.stringify(batch))
      await db.runTransaction(async transaction => {
        const previous = (await transaction.get(reference)).data()
        if (previous && previous.fingerprint !== fingerprint) throw new EmailError(409, 'This batch or its recipients have changed. Review the inboxes before preparing a new batch.')
        if (!previous) transaction.set(reference, { uid, fingerprint, createdAt: now() })
      })
    },
    async reserveSend(uid, requestId, mail) {
      const key = hash(`${uid}:${requestId}`)
      const fingerprint = hash(JSON.stringify(mail))
      const reference = db.collection('gmcEmailRequests').doc(key)
      const limitReference = db.collection('gmcEmailLimits').doc(uid)
      return db.runTransaction(async transaction => {
        const previous = (await transaction.get(reference)).data()
        if (previous) {
          if (previous.fingerprint !== fingerprint) throw new EmailError(409, 'This request has changed. Prepare a new email.')
          if (previous.status === 'accepted') return { key, result: previous.result }
          throw new EmailError(409, 'This email was already attempted. Check the recipient inbox before preparing another email.')
        }
        const currentTime = now()
        const limit = (await transaction.get(limitReference)).data()
        const attempts = (limit?.attempts || []).filter(time => time > currentTime - 3600000)
        if (attempts.length >= hourlyLimit) throw new EmailError(429, 'You have reached the hourly email limit. Please try again later.')
        transaction.set(reference, { uid, fingerprint, status: 'pending', createdAt: currentTime })
        transaction.set(limitReference, { attempts: [...attempts, currentTime] })
        return { key }
      })
    },
    async finishSend({ key }, result) {
      const reference = db.collection('gmcEmailRequests').doc(key)
      await db.runTransaction(async transaction => {
        const saved = (await transaction.get(reference)).data()
        // Do not overwrite confirmed acceptance if a later acknowledgement fails.
        if (!saved || saved.status === 'accepted') return
        transaction.update(reference, {
          status: result ? 'accepted' : 'uncertain', result: result || null, completedAt: now(),
        })
      })
    },
  }
}
