import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEmailDelivery, createEmailHandler, EmailError, validatePayload } from '../server/email-handler.js'
import { MAX_ATTACHMENT_BYTES } from '../shared/email.js'
import { firebaseRest } from '../server/firebase-rest.js'

const origin = 'https://greenmelbourne-connect-801602918282.web.app'
const text = Buffer.from('GreenMelbourne activity information.\nBring a water bottle.\n')
const payload = (extra = {}) => ({
  recipient: 'self', subject: 'Activity information', message: 'Please find your activity information attached.',
  requestId: 'd7bfa0b3-1100-4000-8000-111111111111',
  attachment: { name: 'activity.txt', size: text.length, content: text.toString('base64') }, ...extra,
})
const request = (body = payload(), token = 'organiser', extra = {}) => new Request('https://email.test/send', {
  method: 'POST', headers: { 'Content-Type': 'application/json', origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), ...extra,
})
function fixture(overrides = {}) {
  const messages = [], ledger = new Map()
  const handler = createEmailHandler({
    allowedOrigins: [origin],
    authenticate: async token => {
      if (!['organiser', 'member'].includes(token)) throw new EmailError(401, 'Please sign in again.')
      return { uid: token, email: `${token}@example.test` }
    },
    getProfile: async uid => ({ role: uid === 'organiser' ? 'organiser' : 'member' }),
    getRegistration: async id => id === 'registration-1' ? { email: 'participant@example.test' } : null,
    reserveSend: async (uid, id, mail) => {
      const key = `${uid}/${id}`, fingerprint = JSON.stringify(mail)
      if (ledger.has(key)) {
        const previous = ledger.get(key)
        if (previous.fingerprint !== fingerprint) throw new EmailError(409, 'Request changed.')
        if (!previous.result) throw new EmailError(409, 'Check the inbox before retrying.')
        return previous
      }
      const entry = { key, fingerprint }; ledger.set(key, entry); return entry
    },
    finishSend: async (entry, result) => { entry.result = result },
    deliver: async mail => { messages.push(mail); return { status: 'accepted' } },
    ...overrides,
  })
  return { handler, messages }
}
test('guests, invalid tokens, members and spoofed organiser data cannot send', async () => {
  const { handler, messages } = fixture()
  for (const [token, status] of [[null, 401], ['invalid', 401], ['member', 403]]) {
    assert.equal((await handler(request(payload(), token))).status, status)
  }
  assert.equal((await handler(request(payload({ role: 'organiser' })))).status, 400)
  assert.equal(messages.length, 0)
})
test('organiser sends an exact attachment to their authenticated email', async () => {
  const { handler, messages } = fixture()
  const response = await handler(request())
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin)
  assert.equal((await response.json()).status, 'accepted')
  assert.equal(messages[0].to, 'organiser@example.test')
  assert.equal(messages[0].attachment.type, 'text/plain')
  assert.deepEqual(Buffer.from(messages[0].attachment.content, 'base64'), text)
})
test('recipient comes from an existing registration, never an arbitrary browser email', async () => {
  const { handler, messages } = fixture()
  assert.equal((await handler(request(payload({ recipient: 'registration-1' })))).status, 200)
  assert.equal(messages[0].to, 'participant@example.test')
  assert.equal((await handler(request(payload({ recipient: 'missing' })))).status, 400)
  assert.equal((await handler(request(payload({ recipient: 'external@example.com' })))).status, 400)
  assert.equal((await handler(request(payload({ to: 'external@example.com' })))).status, 400)
  assert.equal(messages.length, 1)
})
test('rejects invalid fields, header injection, missing, oversize and malformed attachments', async () => {
  const bad = [
    null, [], payload({ recipient: '../users' }), payload({ requestId: 'bad' }),
    payload({ subject: 'Hello\r\nBcc: unexpected@example.com' }), payload({ message: 'short' }),
    payload({ attachment: null }), payload({ attachment: { ...payload().attachment, size: 0 } }),
    payload({ attachment: { ...payload().attachment, size: MAX_ATTACHMENT_BYTES + 1 } }),
    payload({ attachment: { ...payload().attachment, name: 'file.exe' } }),
    payload({ attachment: { ...payload().attachment, name: '../file.txt' } }),
    payload({ attachment: { ...payload().attachment, content: 'not base64' } }),
    payload({ attachment: { ...payload().attachment, size: text.length + 1 } }),
    payload({ attachment: { ...payload().attachment, name: 'fake.pdf' } }),
    payload({ attachment: { name: 'binary.txt', size: 2, content: 'AP8=' } }),
  ]
  for (const input of bad) assert.throws(() => validatePayload(input), EmailError)
})
test('enforces origin, request method, JSON and request size before sending', async () => {
  const { handler, messages } = fixture()
  assert.equal((await handler(new Request('https://email.test/send', { headers: { origin: 'https://other.test' } }))).status, 403)
  assert.equal((await handler(new Request('https://email.test/send', { method: 'OPTIONS', headers: { origin } }))).status, 204)
  assert.equal((await handler(new Request('https://email.test/send'))).status, 405)
  assert.equal((await handler(request({}, 'organiser', { body: 'bad JSON' }))).status, 400)
  assert.equal((await handler(request({}, 'organiser', { headers: { Authorization: 'Bearer organiser', 'Content-Type': 'text/plain' } }))).status, 415)
  assert.equal((await handler(request({}, 'organiser', { body: 'x'.repeat(3 * 1024 * 1024) }))).status, 413)
  assert.equal(messages.length, 0)
})
test('the same request is sent once and a changed replay is rejected', async () => {
  const { handler, messages } = fixture()
  const first = await (await handler(request())).json()
  const again = await (await handler(request())).json()
  assert.deepEqual(again, first)
  assert.equal(messages.length, 1)
  assert.equal((await handler(request(payload({ subject: 'A different email' })))).status, 409)
})
test('provider failures do not look like successful delivery or leak secrets', async () => {
  const { handler } = fixture({ deliver: async () => { throw new Error('secret-provider-key') } })
  const response = await handler(request())
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /secret-provider-key/)
  assert.equal((await handler(request())).status, 409)
})
test('SendGrid request carries the exact attachment and plain-text email', async () => {
  let observed
  const deliver = createEmailDelivery({ provider: 'sendgrid', apiKey: 'local-test-key', from: 'sender@example.test', fetcher: async (url, options) => {
    observed = { url, ...options, body: JSON.parse(options.body) }; return new Response(null, { status: 202 })
  } })
  assert.equal((await deliver({ ...validatePayload(payload()), to: 'organiser@example.test', replyTo: 'organiser@example.test' })).status, 'accepted')
  assert.equal(observed.url, 'https://api.sendgrid.com/v3/mail/send')
  assert.equal(observed.body.attachments[0].content, text.toString('base64'))
  assert.equal(observed.body.content[0].type, 'text/plain')
  assert.equal(observed.body.attachments[0].disposition, 'attachment')
})
const gmailSettings = { provider: 'gmail', from: 'sender@gmail.com', clientId: 'fake-client-id', clientSecret: 'fake-client-secret', refreshToken: 'fake-refresh-token' }
test('Gmail refreshes access and sends MIME with the exact attachment bytes and trusted addresses', async () => {
  const calls = []
  const deliver = createEmailDelivery({ ...gmailSettings, fetcher: async (url, options) => {
    calls.push({ url, options })
    return Response.json(url.includes('oauth2') ? { access_token: 'fake-access-token' } : { id: 'fake-message-id' })
  } })
  const fileBytes = Buffer.from('活动详情：请携带水瓶。\n'.repeat(20))
  const input = payload({ attachment: { name: 'activity.txt', size: fileBytes.length, content: fileBytes.toString('base64') } })
  assert.deepEqual(await deliver({ ...validatePayload(input), to: 'participant@example.test', replyTo: 'organiser@example.test' }), { status: 'accepted' })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token')
  assert.equal(calls[0].options.body.get('refresh_token'), 'fake-refresh-token')
  assert.equal(calls[0].options.body.get('grant_type'), 'refresh_token')
  assert.equal(calls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send')
  assert.equal(calls[1].options.headers.Authorization, 'Bearer fake-access-token')
  const raw = JSON.parse(calls[1].options.body).raw
  assert.match(raw, /^[A-Za-z0-9_-]+$/)
  const mime = Buffer.from(raw, 'base64url').toString('utf8')
  assert.match(mime, /From: GreenMelbourne Connect <sender@gmail.com>/)
  assert.match(mime, /To: participant@example.test/)
  assert.match(mime, /Reply-To: organiser@example.test/)
  assert.match(mime, /Subject: Activity information/)
  assert.match(mime, /Please find your activity information attached\./)
  assert.doesNotMatch(mime, /fake-client|fake-refresh|fake-access/)
  const part = mime.split(/\r\n--[^\r\n]+\r\n/).find(section => /Content-Disposition: attachment/.test(section))
  assert(part)
  const encoded = part.split('\r\n\r\n')[1].split('\r\n--')[0].replace(/\s/g, '')
  assert.deepEqual(Buffer.from(encoded, 'base64'), fileBytes)
})
test('Gmail credential and scope failures cannot send or leak provider details', async () => {
  const mail = { ...validatePayload(payload()), to: 'organiser@example.test', replyTo: 'organiser@example.test' }
  for (const setting of [{ ...gmailSettings, refreshToken: '' }, { ...gmailSettings, testRecipient: 'someone@example.test' }]) {
    await assert.rejects(createEmailDelivery({ ...setting, fetcher: () => assert.fail('Google should not be called') })(mail), EmailError)
  }
  let calls = 0
  const deliver = createEmailDelivery({ ...gmailSettings, fetcher: async () => { calls++; return Response.json({ error: 'fake-private-secret' }, { status: 400 }) } })
  await assert.rejects(deliver(mail), error => error.status === 503 && /No email was sent/.test(error.message) && !error.message.includes('fake-private-secret'))
  assert.equal(calls, 1)
})
test('Gmail send failures stay failures and ambiguous requests cannot automatically resend', async () => {
  for (const result of [429, 401, 403, 500, 'timeout', 'missing-id']) {
    let sends = 0
    const deliver = createEmailDelivery({ ...gmailSettings, fetcher: async url => {
      if (url.includes('oauth2')) return Response.json({ access_token: 'fake-access' })
      sends++
      if (result === 'timeout') throw new Error('fake-private-secret')
      return Response.json({ error: 'fake-private-secret' }, { status: result === 'missing-id' ? 200 : result })
    } })
    const { handler } = fixture({ deliver })
    const response = await handler(request())
    assert.equal(response.status, result === 429 ? 429 : result === 'timeout' ? 503 : 502)
    assert.doesNotMatch(await response.text(), /fake-private-secret|fake-access/)
    assert.equal((await handler(request())).status, 409)
    assert.equal(sends, 1)
  }
})
test('Resend uses attachment and idempotency key; unconfigured, restricted and failing providers are rejected', async () => {
  const mail = { ...validatePayload(payload()), to: 'organiser@example.test', replyTo: 'organiser@example.test' }
  let observed
  const deliver = createEmailDelivery({ provider: 'resend', apiKey: 'local-test-key', from: 'sender@example.test', fetcher: async (url, options) => {
    observed = { url, ...options, body: JSON.parse(options.body) }; return Response.json({ id: 'sample' })
  } })
  await deliver(mail)
  assert.equal(observed.url, 'https://api.resend.com/emails')
  assert.equal(observed.headers['Idempotency-Key'], `activity-${mail.requestId}`)
  assert.equal(observed.body.attachments[0].content, text.toString('base64'))
  for (const settings of [{}, { provider: 'resend', apiKey: 'test', from: 'sender@example.test', testRecipient: 'other@example.test' }]) {
    await assert.rejects(createEmailDelivery(settings)(mail), EmailError)
  }
  for (const status of [401, 403, 429, 500]) {
    const send = createEmailDelivery({ provider: 'sendgrid', apiKey: 'test', from: 'sender@example.test', fetcher: async () => Response.json({ error: 'private provider details' }, { status }) })
    await assert.rejects(send(mail), error => error instanceof EmailError && error.status === (status === 429 ? 429 : 502) && !error.message.includes('private provider'))
  }
})
test('Firebase verification binds verified identity to the configured project and forwards its token to Firestore', async () => {
  const claims = { aud: 'demo-greenmelbourne', iss: 'https://securetoken.google.com/demo-greenmelbourne', sub: 'organiser' }
  const token = data => `header.${Buffer.from(JSON.stringify(data)).toString('base64url')}.signature`
  const calls = []
  const backend = firebaseRest({ projectId: 'demo-greenmelbourne', apiKey: 'demo-key', fetcher: async (url, options) => {
    calls.push({ url, options })
    return url.includes('accounts:lookup') ? Response.json({ users: [{ localId: 'organiser', email: 'organiser@example.test' }] })
      : Response.json({ fields: { role: { stringValue: 'organiser' } } })
  } })
  assert.equal((await backend.authenticate(token(claims))).uid, 'organiser')
  await assert.rejects(backend.authenticate(token({ ...claims, aud: 'other-project' })), EmailError)
  await assert.rejects(backend.authenticate(token({ ...claims, sub: 'someone-else' })), EmailError)
  assert.equal((await backend.getProfile('organiser', token(claims))).role, 'organiser')
  assert.equal(calls.at(-1).options.headers.Authorization, `Bearer ${token(claims)}`)
  assert(calls.at(-1).url.endsWith('/gmcUsers/organiser'))
  const disabled = firebaseRest({ projectId: 'demo-greenmelbourne', apiKey: 'demo-key', fetcher: async () => Response.json({ users: [{ localId: 'organiser', disabled: true }] }) })
  await assert.rejects(disabled.authenticate(token(claims)), EmailError)
})
