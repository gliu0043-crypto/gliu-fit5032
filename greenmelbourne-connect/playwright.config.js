import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5178', browserName: 'chromium', channel: 'chrome', headless: true, viewport: { width: 1280, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: [['list']],
  webServer: [
    { command: 'npm run dev:emulator', url: 'http://127.0.0.1:5178', reuseExistingServer: false },
    { command: 'npm run email:dev', url: 'http://127.0.0.1:8787/health', reuseExistingServer: false },
  ],
})
