import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for local-service-os.
 *
 * These tests drive the real app in a browser against the REMOTE Supabase.
 * All test data is isolated inside a throwaway "test business" created in
 * global setup and deleted in global teardown, so nothing touches the real
 * business data — RLS keeps the test tenant fully separate.
 *
 * Credentials for the test user come from .env.local:
 *   E2E_TEST_EMAIL / E2E_TEST_PASSWORD  (created by scripts/e2e-setup-user.ts)
 */
export default defineConfig({
  testDir: "./e2e",
  // Use the e2e-scoped tsconfig (CommonJS) so Node's loader doesn't clash with
  // the app's `module: esnext` setting.
  tsconfig: "./e2e/tsconfig.json",
  // One worker: the suite walks a single linear flow (customer → job →
  // invoice) and shares one logged-in storage state. Parallelism would race
  // on the shared test tenant.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],

  // Log in once, reuse the session for every test.
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    storageState: "e2e/.auth/state.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start the dev server automatically if it isn't already running.
  webServer: {
    command: "bun run dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
