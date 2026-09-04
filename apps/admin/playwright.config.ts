import { defineConfig } from '@playwright/test';

const useSystemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === '1';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...(useSystemChrome ? { channel: 'chrome' } : {}),
  },
  webServer: {
    command: 'node ../../node_modules/next/dist/bin/next start --port 3001',
    url: 'http://127.0.0.1:3001/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  expect: { timeout: 10_000 },
  timeout: 30_000,
});
