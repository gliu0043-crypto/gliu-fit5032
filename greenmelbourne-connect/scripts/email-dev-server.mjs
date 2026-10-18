// Local-only email endpoint. It authenticates against Firebase emulators and
// intentionally has no provider key or network mail delivery implementation.
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { createHash } from 'node:crypto'
import { createEmailHandler, EmailError } from '../server/email-handler.js'
import { firebaseRest } from '../server/firebase-rest.js'

const ledger = new Map()
const recent = new Map()
const batches = new Map()
const handler = createEmailHandler({
  allowedOrigins: ['http://127.0.0.1:5178', 'http://localhost:5178'],
  ...firebaseRest({ projectId: 'demo-greenmelbourne', apiKey: 'demo-key', authOrigin: 'http://127.0.0.1:9199/identitytoolkit.googleapis.com', firestoreOrigin: 'http://127.0.0.1:8188' }),
  reserveBatch: async (uid, id, batch) => {
    const key = `${uid}/${id}`, fingerprint = createHash('sha256').update(JSON.stringify(batch)).digest('hex')
    if (batches.has(key) && batches.get(key) !== fingerprint) throw new EmailError(409, 'This batch has changed. Prepare a new batch.')
    batches.set(key, fingerprint)
  },
  reserveSend: async (uid, requestId, mail) => {
    const key = `${uid}/${requestId}`
    const fingerprint = createHash('sha256').update(JSON.stringify(mail)).digest('hex')
    const old = ledger.get(key)
    if (old) {
      if (old.fingerprint !== fingerprint) throw new EmailError(409, 'This request has changed. Prepare a new email.')
      if (!old.result) throw new EmailError(409, 'The earlier send result is uncertain. Check the inbox before preparing another email.')
      return old
    }
    const now = Date.now()
    const attempts = (recent.get(uid) || []).filter(time => now - time < 3600000)
    if (attempts.length >= 20) throw new EmailError(429, 'The hourly email limit has been reached. Please try again later.')
    recent.set(uid, [...attempts, now])
    const entry = { key, fingerprint }
    ledger.set(key, entry)
    return entry
  },
  finishSend: async (entry, result) => { entry.result = result },
  deliver: async () => ({ status: 'simulated' }),
})

const server = createServer(async (req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'local-simulation' })); return }
  if (req.url !== '/send') { res.writeHead(404).end(); return }
  try {
    const request = new Request('http://127.0.0.1:8787/send', { method: req.method, headers: req.headers,
      ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
    })
    const response = await handler(request)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(await response.text())
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Local email test failed.' }))
  }
})
server.listen(8787, '127.0.0.1', () => console.log('Local simulated email endpoint: http://127.0.0.1:8787/send — no real email is sent.'))
