import { mkdir, copyFile } from 'node:fs/promises'

// Firebase uploads only functions/. Copy the shared validation and handler so
// the deployed function and local tests always use the same source code.
for (const directory of ['server', 'shared']) {
  await mkdir(new URL(`../functions/${directory}/`, import.meta.url), { recursive: true })
}
for (const file of ['server/email-handler.js', 'shared/email.js']) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(`../functions/${file}`, import.meta.url))
}
console.log('Prepared shared email modules for Firebase Functions.')
