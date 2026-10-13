import { loadEnv } from 'vite'
const env = loadEnv('production', process.cwd(), 'VITE_')
const missing = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID'].filter((name) => !env[`VITE_FIREBASE_${name}`])
if (missing.length || env.VITE_USE_FIREBASE_EMULATORS === 'true' || env.VITE_FIREBASE_PROJECT_ID?.startsWith('demo-')) {
  console.error('Production build requires real Firebase settings in .env.local and emulators disabled. Missing:', missing.join(', '))
  process.exit(1)
}
if (env.VITE_EMAIL_ENDPOINT) {
  let url
  try { url = new URL(env.VITE_EMAIL_ENDPOINT) } catch { /* rejected below */ }
  if (!url || url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password) {
    console.error('The production email endpoint must be a public HTTPS URL without credentials.')
    process.exit(1)
  }
}
