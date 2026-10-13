import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startGmailAuthorisation } from '../scripts/gmail-oauth.mjs'

const scope = 'https://www.googleapis.com/auth/gmail.send'
const client = { project_id: 'fit5032-9edfc', client_id: 'test.apps.googleusercontent.com', client_secret: 'fake-client-secret' }
async function fixture(t, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'gmc-oauth-test-'))
  const outputPath = join(directory, 'email-config.local.json')
  const calls = []
  const setup = await startGmailAuthorisation({ client, outputPath, fetcher: async (url, options) => {
    calls.push({ url, options })
    return url.endsWith('/token')
      ? Response.json({ access_token: 'fake-access-token', refresh_token: 'fake-refresh-token', scope: `openid email ${scope}` })
      : Response.json({ email: 'sender@gmail.com', email_verified: true })
  }, ...overrides })
  t.after(async () => { setup.cancel(); await rm(directory, { recursive: true, force: true }) })
  const response = await fetch(new URL('start', setup.url), { redirect: 'manual' })
  assert.equal(response.status, 302)
  const auth = new URL(response.headers.get('location'))
  const callback = new URL(auth.searchParams.get('redirect_uri'))
  callback.search = new URLSearchParams({ code: 'fake-one-use-code', state: auth.searchParams.get('state') })
  return { ...setup, outputPath, auth, callback, calls }
}

test('desktop OAuth uses state and PKCE, only sending/identity scopes, and saves owner-only credentials', async t => {
  const setup = await fixture(t)
  assert.equal(setup.auth.origin, 'https://accounts.google.com')
  assert.equal(setup.auth.searchParams.get('access_type'), 'offline')
  assert.equal(setup.auth.searchParams.get('code_challenge_method'), 'S256')
  assert.deepEqual(new Set(setup.auth.searchParams.get('scope').split(' ')), new Set(['openid', 'email', scope]))
  const response = await fetch(setup.callback)
  assert.equal(response.status, 200)
  assert.equal(new URL(response.url).pathname, '/done')
  assert.equal(new URL(response.url).search, '')
  const body = await response.text()
  assert.match(body, /No email was sent/)
  assert.doesNotMatch(body, /fake-access-token|fake-refresh-token|fake-client-secret|fake-one-use-code/)
  await setup.completed
  const tokenRequest = setup.calls[0].options.body
  assert.equal(tokenRequest.get('code'), 'fake-one-use-code')
  assert.equal(createHash('sha256').update(tokenRequest.get('code_verifier')).digest('base64url'), setup.auth.searchParams.get('code_challenge'))
  assert.deepEqual(setup.calls.map(call => call.url), ['https://oauth2.googleapis.com/token', 'https://openidconnect.googleapis.com/v1/userinfo'])
  assert.equal(setup.calls[1].options.headers.Authorization, 'Bearer fake-access-token')
  const config = JSON.parse(await readFile(setup.outputPath, 'utf8'))
  assert.deepEqual(config, { provider: 'gmail', from: 'sender@gmail.com', clientId: client.client_id, clientSecret: client.client_secret, refreshToken: 'fake-refresh-token', testRecipient: '' })
  assert.equal((await stat(setup.outputPath)).mode & 0o777, 0o600)
})

test('invalid state, cancelled consent and cross-site start never exchange tokens or create credentials', async t => {
  const setup = await fixture(t)
  const wrongState = new URL(setup.callback); wrongState.searchParams.set('state', 'forged')
  assert.equal((await fetch(wrongState)).status, 400)
  const cancelled = new URL(setup.callback); cancelled.searchParams.set('error', 'access_denied')
  assert.equal((await fetch(cancelled)).status, 400)
  assert.equal((await fetch(new URL('start', setup.url), { headers: { 'Sec-Fetch-Site': 'cross-site' }, redirect: 'manual' })).status, 403)
  assert.equal(setup.calls.length, 0)
  await assert.rejects(readFile(setup.outputPath), { code: 'ENOENT' })
})

test('missing sending consent or an unverified/invalid email cannot save a configuration', async t => {
  for (const failure of ['scope', 'refresh', 'verified', 'email']) {
    const setup = await fixture(t, { fetcher: async url => url.endsWith('/token')
      ? Response.json({ access_token: 'fake-access', refresh_token: failure === 'refresh' ? undefined : 'fake-refresh', scope: failure === 'scope' ? 'openid email' : scope })
      : Response.json({ email: failure === 'email' ? 'invalid-address' : 'sender@gmail.com', email_verified: failure !== 'verified' }) })
    const response = await fetch(setup.callback)
    assert.equal(response.status, 400)
    assert.equal(new URL(response.url).search, '')
    assert.doesNotMatch(await response.text(), /fake-access|fake-refresh|fake-client-secret/)
    await assert.rejects(setup.completed, /not completed/)
    await assert.rejects(readFile(setup.outputPath), { code: 'ENOENT' })
  }
})

test('a Google-verified school address with Gmail sending consent can be the sender', async t => {
  const setup = await fixture(t, { fetcher: async url => url.endsWith('/token')
    ? Response.json({ access_token: 'fake-access', refresh_token: 'fake-refresh', scope: `openid email ${scope}` })
    : Response.json({ email: 'student@student.example.edu', email_verified: true }) })
  assert.equal((await fetch(setup.callback)).status, 200)
  await setup.completed
  assert.equal(JSON.parse(await readFile(setup.outputPath, 'utf8')).from, 'student@student.example.edu')
})

test('token, network and account-service failures return useful fixed messages without private response details', async t => {
  for (const scenario of ['token_network', 'invalid_grant', 'invalid_client', 'token_rejected', 'profile_rejected']) {
    const setup = await fixture(t, { fetcher: async url => {
      if (scenario === 'token_network') throw new Error('private-token-and-account-details')
      if (url.endsWith('/token')) {
        if (scenario !== 'profile_rejected') return Response.json({ error: scenario === 'token_rejected' ? 'private-token-and-account-details' : scenario, error_description: 'private-token-and-account-details' }, { status: 400 })
        return Response.json({ access_token: 'private-token-and-account-details', refresh_token: 'fake-refresh', scope })
      }
      return Response.json({ error: 'private-token-and-account-details' }, { status: 403 })
    } })
    const response = await fetch(setup.callback)
    assert.equal(response.status, 400)
    assert.doesNotMatch(await response.text(), /private-token-and-account-details/)
    await assert.rejects(setup.completed, error => error.code === scenario && !error.message.includes('private-token-and-account-details'))
    await assert.rejects(readFile(setup.outputPath), { code: 'ENOENT' })
  }
})

test('wrong-project clients are rejected before opening a callback listener', async () => {
  await assert.rejects(startGmailAuthorisation({ client: { ...client, project_id: 'other-project' }, outputPath: '/unused' }), /fit5032-9edfc/)
})
