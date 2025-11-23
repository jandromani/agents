import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? process.env.SMOKE_BASE_URL;
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const stripeSandboxKey = process.env.STRIPE_SANDBOX_KEY;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: {
      'x-supabase-url': supabaseUrl || '',
      'x-stripe-sandbox-key': stripeSandboxKey || '',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: baseURL
    ? undefined
    : {
        command: 'npm run preview -- --host --port 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
