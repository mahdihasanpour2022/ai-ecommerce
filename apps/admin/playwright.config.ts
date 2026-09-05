import { defineConfig } from '@playwright/test';

const useSystemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === '1';
const e2ePort = 3101;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...(useSystemChrome ? { channel: 'chrome' } : {}),
  },
  webServer: {
    command: 'node e2e/start-production.mjs',
    url: `http://127.0.0.1:${e2ePort}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  expect: { timeout: 10_000 },
  timeout: 30_000,
});
