import { readFileSync } from "node:fs";
import { test as base } from "@playwright/test";

/** Write tests (create / update / delete real data) run only when this is explicitly on. */
export const ALLOW_WRITES = process.env.E2E_ALLOW_WRITES === "1";

/** Put `test.skip(...)` for write flows through this so a read-only run (the default) never changes data. */
export const test = base.extend<{ requireWrites: void }>({
  requireWrites: [
    async ({}, use, testInfo) => {
      testInfo.skip(!ALLOW_WRITES, "changes real data: set E2E_ALLOW_WRITES=1 against a non-production API");
      await use();
    },
    { auto: false },
  ],
});

export { expect } from "@playwright/test";

export const ACCESS_KEY = "clothes_shop_access_token";
export const REFRESH_KEY = "clothes_shop_refresh_token";

export interface AuthMeta {
  status: "ok" | "missing" | "expired" | "rejected" | "unreachable";
  email?: string;
  role?: string;
  daysLeft?: number | null;
}

/** What the setup project found out about the test account (`.auth/session.json`); `missing` when it did not run. */
export function readAuthMeta(): AuthMeta {
  try {
    return JSON.parse(readFileSync(".auth/session.json", "utf8"));
  } catch {
    return { status: "missing" };
  }
}

/** The refresh token of the test account, as read from `.env.e2e.local` / the environment. */
export const refreshTokenFromEnv = () => process.env.E2E_REFRESH_TOKEN ?? "";
