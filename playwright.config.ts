import { defineConfig, devices } from "@playwright/test";
import { loadE2EEnv } from "./tests/_support/e2e-session";

/* Browser tests against the real API: `*.e2e.ts` signed out, `*.auth.e2e.ts` signed in.
   Token and switches: tests/README.md. */
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
