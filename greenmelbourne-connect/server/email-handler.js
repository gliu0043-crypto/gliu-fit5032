import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import nodemailer from 'nodemailer'
import { attachmentType, MAX_ATTACHMENT_BYTES, MAX_BATCH_RECIPIENTS, validateEmailForm } from '../shared/email.js'

const MAX_REQUEST_BYTES = Math.ceil(MAX_ATTACHMENT_BYTES * 4 / 3) + 16000
const emailPattern = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/
export class EmailError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

export function validatePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new EmailError(400, 'Invalid email request.')
  if (Object.keys(input).some(key => !['recipient', 'subject', 'message', 'attachment', 'requestId'].includes(key))) {
    throw new EmailError(400, 'Unexpected email request fields.')
  }
  if (typeof input.recipient !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(input.recipient)) {
    throw new EmailError(400, 'Choose yourself or a registered participant.')
  }
  if (typeof input.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(input.requestId)) throw new EmailError(400, 'Invalid request identifier.')
  const errors = validateEmailForm(input)
  if (Object.keys(errors).length) throw new EmailError(400, Object.values(errors)[0])
  const file = input.attachment
  if (typeof file.content !== 'string' || file.content.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) {
    throw new EmailError(400, 'Invalid attachment encoding.')
  }
  const bytes = Buffer.from(file.content, 'base64')
  if (bytes.length !== file.size || bytes.toString('base64') !== file.content) throw new EmailError(400, 'The attachment size does not match the file.')
  const type = attachmentType(file.name)
  if ((type === 'application/pdf' && bytes.subarray(0, 5).toString() !== '%PDF-')
    || (type === 'image/png' && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
    || (type === 'image/jpeg' && bytes.subarray(0, 3).toString('hex') !== 'ffd8ff')) {
    throw new EmailError(400, 'The attachment contents do not match its file type.')
  }
  if (type === 'text/plain') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error('binary text')
    } catch { throw new EmailError(400, 'TXT attachments must contain UTF-8 text.') }
  }
  return {
    recipient: input.recipient, requestId: input.requestId,
    subject: input.subject.trim(), message: input.message.trim(),
    attachment: { name: file.name, size: bytes.length, content: file.content, type },
  }
}

async function readLimitedJson(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new EmailError(415, 'Use a JSON email request.')
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) throw new EmailError(413, 'The email attachment is too large.')
  if (!request.body) throw new EmailError(400, 'The email request is empty.')
  const reader = request.body.getReader()
  const chunks = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_REQUEST_BYTES) { await reader.cancel(); throw new EmailError(413, 'The email attachment is too large.') }
    chunks.push(Buffer.from(value))
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new EmailError(400, 'The email request could not be read.') }
}

export function validateBatchPayload(input) {
  if (!input || Object.keys(input).some(key => !['recipients', 'subject', 'message', 'attachment', 'requestId'].includes(key))
    || !Array.isArray(input.recipients) || input.recipients.length < 1 || input.recipients.length > MAX_BATCH_RECIPIENTS
    || input.recipients.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id))) {
    throw new EmailError(400, `Choose between 1 and ${MAX_BATCH_RECIPIENTS} registered recipients.`)
  }
  const { recipients, ...rest } = input
  const { recipient, ...validated } = validatePayload({ ...rest, recipient: 'self' })
  return { ...validated, recipients: [...new Set(recipients)].sort() }
}

// One immutable batch manifest, plus the existing durable reservation for each
// individual address. Replaying a batch never automatically resends an uncertain mail.
async function processBatch(input, actor, bearer, { getRegistration, reserveBatch, reserveSend, finishSend, deliver }) {
  const addresses = new Map()
  for (const id of input.recipients) {
    const row = id === 'self' ? { email: actor.email } : await getRegistration(id, bearer)
    if (!emailPattern.test(row?.email || '')) throw new EmailError(400, 'A selected registration is no longer valid. Review the recipients before sending.')
    const to = row.email.trim().toLowerCase()
    if (!addresses.has(to)) addresses.set(to, { recipient: id, to })
  }
  const recipients = [...addresses.values()]
  await reserveBatch(actor.uid, input.requestId, { ...input, resolvedRecipients: recipients, replyTo: actor.email })
  const results = []
  let stopped = false
  for (const { recipient, to } of recipients) {
    if (stopped) { results.push({ recipient, to, status: 'not-sent', message: 'Batch paused after a service or rate-limit error. Resume this batch later.' }); continue }
    const requestId = createHash('sha256').update(`batch:${input.requestId}:${to}`).digest('hex')
    const mail = { requestId, recipient, to, replyTo: actor.email, subject: input.subject, message: input.message, attachment: input.attachment }
    let reservation
    try {
      reservation = await reserveSend(actor.uid, requestId, mail)
      if (reservation.result) { results.push({ ...reservation.result, recipient }); continue }
      const delivered = await deliver(mail)
      const saved = { status: delivered.status, to, requestId }
      await finishSend(reservation, saved)
      results.push({ ...saved, recipient })
    } catch (error) {
      if (reservation && !reservation.result) await finishSend(reservation, null).catch(() => {})
      results.push({ recipient, to, status: reservation || error.status === 409 ? 'unconfirmed' : 'not-sent',
        message: error instanceof EmailError ? error.message : 'The send result could not be confirmed. Check this inbox before preparing another batch.' })
      if (!(error instanceof EmailError) || [401, 403, 429, 502, 503].includes(error.status)) stopped = true
    }
  }
  return { status: 'batch-complete', requestId: input.requestId, duplicateCount: input.recipients.length - recipients.length, results }
}

// The hosting adapter verifies Firebase tokens and reads Firestore. Keeping this
// handler independent lets local tests exercise the real validation/send flow.
export function createEmailHandler({ allowedOrigins, authenticate, getProfile, getRegistration, deliver, reserveSend, finishSend, reserveBatch }) {
  return async function handle(request) {
    const origin = request.headers.get('origin')
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' }
    if (origin && !allowedOrigins.includes(origin)) return Response.json({ error: 'This website cannot use the email service.' }, { status: 403, headers })
    if (origin) headers['Access-Control-Allow-Origin'] = origin
    const reply = (data, status = 200) => Response.json(data, { status, headers })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600',
    } })
    if (request.method !== 'POST') return reply({ error: 'Use POST to send an email.' }, 405)
    let reservation
    try {
      const bearer = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1]
      if (!bearer) throw new EmailError(401, 'Please sign in before sending an email.')
      const actor = await authenticate(bearer)
      if (!actor?.uid || !emailPattern.test(actor.email || '')) throw new EmailError(401, 'Please sign in again.')
      const profile = await getProfile(actor.uid, bearer)
      if (profile?.role !== 'organiser') throw new EmailError(403, 'Only organisers can send activity emails.')
      const body = await readLimitedJson(request)
      if (body && Object.hasOwn(body, 'recipients')) {
        const batch = validateBatchPayload(body)
        return reply(await processBatch(batch, actor, bearer, { getRegistration, reserveBatch, reserveSend, finishSend, deliver }))
      }
      const input = validatePayload(body)
      const registration = input.recipient === 'self' ? null : await getRegistration(input.recipient, bearer)
      const to = input.recipient === 'self' ? actor.email : registration?.email
      if (!emailPattern.test(to || '')) throw new EmailError(400, 'This participant no longer has a valid registration email.')
      const mail = { ...input, to, replyTo: actor.email }
      reservation = await reserveSend(actor.uid, input.requestId, mail)
      if (reservation.result) return reply(reservation.result)
      const result = await deliver(mail)
      const saved = { status: result.status, to, requestId: input.requestId }
      await finishSend(reservation, saved)
      return reply(saved)
    } catch (error) {
      if (reservation && !reservation.result) await finishSend(reservation, null).catch(() => {})
      return reply({ error: error instanceof EmailError ? error.message : 'The send result could not be confirmed. Check the recipient inbox before trying again.' }, error instanceof EmailError ? error.status : 503)
    }
  }
}

// Stream transport only builds MIME bytes; delivery goes through Gmail's HTTPS
// API, never SMTP. Files are passed as bytes, with file/URL access disabled.
async function sendGmail(mail, { from, clientId, clientSecret, refreshToken, fetcher }) {
  let tokenResponse
  try {
    tokenResponse = await fetcher('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
      signal: AbortSignal.timeout(10000),
    })
  } catch { throw new EmailError(503, 'Gmail authorisation is temporarily unavailable. No email was sent.') }
  const token = await tokenResponse.json().catch(() => ({}))
  if (!tokenResponse.ok || !token.access_token) {
    throw new EmailError(503, 'Gmail authorisation needs to be renewed by the site owner. No email was sent.')
  }
  const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows', disableFileAccess: true, disableUrlAccess: true })
  const { message } = await composer.sendMail({
    from: { name: 'GreenMelbourne Connect', address: from }, to: { address: mail.to },
    replyTo: { address: mail.replyTo }, subject: mail.subject, text: mail.message,
    attachments: [{ filename: mail.attachment.name, content: Buffer.from(mail.attachment.content, 'base64'), contentType: mail.attachment.type, contentDisposition: 'attachment' }],
    disableFileAccess: true, disableUrlAccess: true,
  })
  let response
  try {
    response = await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: message.toString('base64url') }), signal: AbortSignal.timeout(15000),
    })
  } catch { throw new EmailError(503, 'Gmail did not confirm the send result. Check the recipient inbox before trying again.') }
  if (response.status === 429) throw new EmailError(429, 'The Gmail sending limit has been reached. Please try again later.')
  if (response.status === 401 || response.status === 403) throw new EmailError(502, 'Gmail rejected the request. The site owner should check the Gmail API and sender authorisation.')
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.id) throw new EmailError(502, 'Gmail did not confirm the send result. Check the recipient inbox before trying again.')
  return { status: 'accepted' }
}

export function createEmailDelivery({ provider, apiKey, from, clientId, clientSecret, refreshToken, testRecipient = '', fetcher = fetch }) {
  return async (mail) => {
    const credentialsPresent = provider === 'gmail' ? clientId && clientSecret && refreshToken : apiKey
    if (!credentialsPresent || !emailPattern.test(from || '') || !['sendgrid', 'resend', 'gmail'].includes(provider)) {
      throw new EmailError(503, 'Email sending is not configured yet. Please contact the organiser.')
    }
    if (testRecipient && mail.to.toLowerCase() !== testRecipient.toLowerCase()) {
      throw new EmailError(400, 'Email testing is currently limited to the configured test inbox. Choose My email or contact the organiser.')
    }
    if (provider === 'gmail') return sendGmail(mail, { from, clientId, clientSecret, refreshToken, fetcher })
    const attachment = mail.attachment
    const sendgrid = provider === 'sendgrid'
    const body = sendgrid ? {
      personalizations: [{ to: [{ email: mail.to }] }], from: { email: from, name: 'GreenMelbourne Connect' },
      reply_to: { email: mail.replyTo }, subject: mail.subject, content: [{ type: 'text/plain', value: mail.message }],
      attachments: [{ content: attachment.content, filename: attachment.name, type: attachment.type, disposition: 'attachment' }],
    } : {
      from: `GreenMelbourne Connect <${from}>`, to: [mail.to], reply_to: mail.replyTo,
      subject: mail.subject, text: mail.message,
      attachments: [{ content: attachment.content, filename: attachment.name, content_type: attachment.type }],
    }
    let response
    try {
      response = await fetcher(sendgrid ? 'https://api.sendgrid.com/v3/mail/send' : 'https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(!sendgrid ? { 'Idempotency-Key': `activity-${mail.requestId}` } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
      })
    } catch {
      throw new EmailError(503, 'The email provider did not confirm the result. Check the recipient inbox before trying again.')
    }
    if (!response.ok) {
      if (response.status === 429) throw new EmailError(429, 'The email service limit has been reached. Please try again later.')
      throw new EmailError(502, 'The email service rejected this message. Check the sender verification and service configuration.')
    }
    return { status: 'accepted' }
  }
}
