import { createServer } from 'node:http'
import { randomBytes, createHash } from 'node:crypto'
import { writeFile, rename } from 'node:fs/promises'

const sendScope = 'https://www.googleapis.com/auth/gmail.send'
const scopes = `openid email ${sendScope}`
const failures = {
  token_network: 'Could not reach the Google token service. Check the connection and restart setup.',
  token_rejected: 'Google rejected the authorisation exchange. Restart setup and grant access again.',
  invalid_client: 'Google rejected this OAuth client. Check that the downloaded Desktop client is still enabled.',
  invalid_grant: 'The one-use Google authorisation code was rejected or expired. Restart setup to get a new code.',
  missing_refresh: 'Google did not return offline access. Restart setup and approve the requested access.',
  missing_send_scope: 'Gmail sending permission was not granted. Restart setup and select Send email on your behalf.',
  profile_network: 'Could not reach the Google account identity service. Check the connection and restart setup.',
  profile_rejected: 'Google did not confirm the account identity. Restart setup and allow access to your email address.',
  unverified_email: 'Google did not confirm a verified email address for this account.',
  save_failed: 'Authorisation was received but the local configuration file could not be saved. Check folder permissions.',
  unknown: 'An unexpected setup error occurred. Restart setup; no credentials were logged.',
}
export class GmailSetupError extends Error {
  constructor(code) {
    const safeCode = Object.hasOwn(failures, code) ? code : 'unknown'
    super(`Gmail authorisation was not completed: ${failures[safeCode]}`)
    this.code = safeCode
  }
}
async function requestJson(fetcher, url, options, failure) {
  try {
    const response = await fetcher(url, options)
    return { ok: response.ok, data: await response.json() }
  } catch { throw new GmailSetupError(failure) }
}
const html = message => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GreenMelbourne Gmail setup</title><body style="max-width:640px;margin:60px auto;padding:24px;font:18px/1.6 system-ui"><h1>GreenMelbourne Gmail setup</h1>${message}</body></html>`

// A local, one-use authorisation helper. It neither sends email nor logs tokens.
// Desktop OAuth + PKCE needs no purchased domain or publicly exposed callback.
export async function startGmailAuthorisation({ client, outputPath, fetcher = fetch, timeoutMs = 15 * 60 * 1000 }) {
  if (client?.project_id !== 'fit5032-9edfc' || !client.client_id?.endsWith('.apps.googleusercontent.com') || !client.client_secret) {
    throw new Error('Use the Desktop OAuth client JSON downloaded from project fit5032-9edfc.')
  }
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  let resolveDone, rejectDone, timer, redirectUri, host, completion, busy = false
  const completed = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject })
  // The caller may still be opening the browser when setup times out.
  completed.catch(() => {})
  const page = (res, status, message) => {
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    })
    res.end(html(message))
  }
  const finish = () => {
    clearTimeout(timer)
    server.close()
    if (completion?.success) resolveDone()
    else rejectDone(completion?.error || new GmailSetupError('unknown'))
  }
  const showCompletion = (res, success, error) => {
    completion = { success, error }
    // Remove the one-use OAuth code from the visible address before showing a
    // result, so later screenshots do not include authorisation parameters.
    res.writeHead(303, { Location: '/done', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
    res.end()
    timer = setTimeout(finish, 10000)
  }
  const server = createServer(async (req, res) => {
    if (req.headers.host !== host || req.method !== 'GET') return page(res, 400, '<p>Invalid setup request.</p>')
    const url = new URL(req.url, `http://${host}`)
    if (url.pathname === '/done' && completion) {
      page(res, completion.success ? 200 : 400, completion.success
        ? '<p>Authorisation saved successfully. You can close this tab and return to Codex. No email was sent.</p><p>If your Google OAuth app is in Testing, Gmail authorisation expires after 7 days. Repeat this setup before a later demonstration if needed.</p>'
        : `<p>${completion.error.message}</p><p>No email was sent.</p>`)
      finish()
      return
    }
    if (url.pathname === '/') {
      return page(res, 200, '<p>Connect the Gmail or Google Workspace account you want to use as the sender. Use an account listed as an OAuth test user. Google will ask for permission to send email and confirm your email address. This does not give the application access to read your inbox.</p><p>The authorisation is stored locally and will be deployed to your Firebase secret configuration. This setup does not send any emails.</p><p><a href="/start">Connect Gmail with Google</a></p>')
    }
    if (url.pathname === '/start') {
      if (req.headers['sec-fetch-site'] === 'cross-site') return page(res, 403, '<p>Open the local setup page first.</p>')
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      auth.search = new URLSearchParams({ client_id: client.client_id, redirect_uri: redirectUri, response_type: 'code',
        scope: scopes, access_type: 'offline', prompt: 'consent select_account', state,
        code_challenge: challenge, code_challenge_method: 'S256' }).toString()
      res.writeHead(302, { Location: auth.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
      return res.end()
    }
    if (url.pathname !== '/oauth/callback') return page(res, 404, '<p>Page not found.</p>')
    if (url.searchParams.get('state') !== state || busy) return page(res, 400, '<p>Invalid or already-used authorisation request. Return to the setup page.</p>')
    if (url.searchParams.has('error')) return page(res, 400, '<p>Google authorisation was not completed. No configuration was saved. Return to the setup page to try again.</p>')
    const code = url.searchParams.get('code')
    if (!code) return page(res, 400, '<p>No authorisation code was returned.</p>')
    busy = true
    clearTimeout(timer)
    try {
      const response = await requestJson(fetcher, 'https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: client.client_id, client_secret: client.client_secret,
          code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri }),
        signal: AbortSignal.timeout(15000),
      }, 'token_network')
      const token = response.data
      if (!response.ok || !token.access_token) {
        throw new GmailSetupError(['invalid_client', 'invalid_grant'].includes(token.error) ? token.error : 'token_rejected')
      }
      if (!token.refresh_token) throw new GmailSetupError('missing_refresh')
      if (!token.scope?.split(' ').includes(sendScope)) throw new GmailSetupError('missing_send_scope')
      const profileResponse = await requestJson(fetcher, 'https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000),
      }, 'profile_network')
      const profile = profileResponse.data
      if (!profileResponse.ok) throw new GmailSetupError('profile_rejected')
      if (profile.email_verified !== true || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(profile.email || '')) {
        throw new GmailSetupError('unverified_email')
      }
      const config = { provider: 'gmail', from: profile.email, clientId: client.client_id,
        clientSecret: client.client_secret, refreshToken: token.refresh_token, testRecipient: '' }
      const temporaryPath = `${outputPath}.${randomBytes(6).toString('hex')}.tmp`
      try {
        await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
        await rename(temporaryPath, outputPath)
      } catch { throw new GmailSetupError('save_failed') }
      showCompletion(res, true)
    } catch (error) {
      showCompletion(res, false, error instanceof GmailSetupError ? error : new GmailSetupError('unknown'))
    }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  host = `127.0.0.1:${server.address().port}`
  redirectUri = `http://${host}/oauth/callback`
  const cancel = () => { clearTimeout(timer); server.close(); rejectDone(new Error('Gmail setup closed.')) }
  timer = setTimeout(() => { server.close(); rejectDone(new Error('Gmail setup timed out. Run it again to authorise.')) }, timeoutMs)
  return { url: `http://${host}/`, completed, cancel }
}
