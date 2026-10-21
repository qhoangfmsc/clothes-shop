import { defineConfig, devices } from "@playwright/test";
import { loadE2EEnv } from "./tests/_support/e2e-session";

/**
 * Browser tests (Playwright) — the few flows that must work end to end. Files: `tests/**\/*.e2e.ts`, next to the
 * unit tests of the module they protect (`tests/<group>/<module>/`), plus cross-module journeys in `tests/e2e/`.
 *
 * Two kinds of flow:
 *   - signed out:  `*.e2e.ts`        projects `desktop` and `phone` (no login needed, always run)
 *   - signed in:   `*.auth.e2e.ts`   projects `desktop-auth` and `phone-auth`, after `setup` has checked the test
 *                                    account's token (tests/_support/auth.setup.ts). If the token expired, `setup`
 *                                    fails with what to replace, and only the signed-in projects stop.
 *
 * They run against the REAL API, not mocks. The only thing the owner maintains is `E2E_REFRESH_TOKEN` in
 * `.env.e2e.local` (git-ignored; template `.env.e2e.example`). The rest are optional overrides from the shell/CI:
 *   - `E2E_REFRESH_TOKEN`  the test account's refresh token (the only secret; 30 days)
 *   - `E2E_BASE_URL`       the site to test (a deployed FE). Unset = use / start `yarn dev` (API from `.env.local`)
 *   - `E2E_API_URL`        the API behind that site (required with `E2E_BASE_URL`)
 *   - `E2E_ALLOW_WRITES=1` lets write tests change data. Off by default; only against non-production data.
 */
loadE2EEnv();
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const isCI = !!process.env.CI;
const STATE_FILE = ".auth/user.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", testMatch: "**/*.e2e.ts", testIgnore: "**/*.auth.e2e.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", testMatch: "**/*.e2e.ts", testIgnore: "**/*.auth.e2e.ts", use: { ...devices["Pixel 7"] } },
    { name: "setup", testMatch: "**/auth.setup.ts" },
    {
      name: "desktop-auth",
      testMatch: "**/*.auth.e2e.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: STATE_FILE },
    },
    {
      name: "phone-auth",
      testMatch: "**/*.auth.e2e.ts",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], storageState: STATE_FILE },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "yarn dev", url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
