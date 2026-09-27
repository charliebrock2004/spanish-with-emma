import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests on an iPhone-sized viewport, with the browser's speech APIs
 * mocked (see e2e/support/speech.ts) so microphone flows run headlessly.
 *
 *   npm run test:e2e                         builds, starts and tests the app
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e   tests a running server
 */
const external = process.env.E2E_BASE_URL;
const port = 3100;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: external ?? `http://localhost:${port}`,
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'en-GB',
    trace: 'retain-on-failure',
  },
  webServer: external
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${port}`,
        port,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
      },
});
