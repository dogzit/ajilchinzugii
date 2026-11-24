import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // The rater's document path runs on the deterministic mock reader, and
    // the per-IP limits are off: every test comes from the same address.
    // None of these is ever set on a real deployment.
    // Anonymous counts are off too: CI's browser job reads a real database.
    env: { RATER_EXTRACTOR: 'mock', RATE_LIMIT_DISABLED: 'true', RATER_STATS_DISABLED: 'true' },
  },
});
