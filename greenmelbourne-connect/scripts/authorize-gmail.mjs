import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { startGmailAuthorisation, GmailSetupError } from './gmail-oauth.mjs'

const clientPath = process.argv[2] || fileURLToPath(new URL('../gmail-client.local.json', import.meta.url))
const outputPath = fileURLToPath(new URL('../email-config.local.json', import.meta.url))
try {
  const downloaded = JSON.parse(await readFile(clientPath, 'utf8'))
  const setup = await startGmailAuthorisation({ client: downloaded.installed, outputPath })
  console.log(`Open this local setup page in your normal browser: ${setup.url}`)
  console.log('Sign in and approve Gmail sending yourself. This setup does not send email.')
  process.once('SIGINT', setup.cancel)
  await setup.completed
  console.log('Gmail authorisation saved in the Git-ignored email-config.local.json (owner-only permissions).')
} catch (error) {
  // Do not echo Google response bodies, client credentials or local JSON values.
  console.error(error instanceof GmailSetupError ? error.message : error.code === 'ENOENT' ? 'Download the Desktop OAuth client JSON and save it as gmail-client.local.json first.' : 'Gmail setup did not complete. Check the client file belongs to FIT5032 and retry authorisation.')
  process.exitCode = 1
}
