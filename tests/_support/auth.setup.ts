import { mkdirSync, writeFileSync } from "node:fs";
import { test as setup } from "@playwright/test";
import { ENV_FILE, checkSession, explainCheck, loadE2EEnv, maskEmail } from "./e2e-session";

/* Runs once before the signed-in projects. It checks the test account's refresh token, and either prepares the
   browser state (`.auth/user.json`, git-ignored) or STOPS the signed-in projects with a message that says what to
   replace. Signed-out projects do not depend on it and always run. */

export const STATE_FILE = ".auth/user.json";
export const META_FILE = ".auth/session.json";
const ACCESS_KEY = "clothes_shop_access_token";
const REFRESH_KEY = "clothes_shop_refresh_token";

setup("prepare the signed-in test account", async ({ baseURL }) => {
  const { apiUrl } = loadE2EEnv();
  const refreshToken = process.env.E2E_REFRESH_TOKEN ?? "";
  mkdirSync(".auth", { recursive: true });
  const writeMeta = (meta: object) => writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  const emptyState = { cookies: [], origins: [] };

  if (!refreshToken) {
    writeFileSync(STATE_FILE, JSON.stringify(emptyState));
    writeMeta({ status: "missing" });
    console.warn(`\n[e2e] ${explainCheck({ status: "missing" })}\n`);
    setup.info().annotations.push({ type: "skipped-signed-in", description: "no E2E_REFRESH_TOKEN" });
    return;
  }
  if (!apiUrl) throw new Error(`E2E_BASE_URL is set, so also set E2E_API_URL (the API behind that site) in ${ENV_FILE}.`);

  const check = await checkSession({ apiUrl, refreshToken });
  const message = explainCheck(check);

  if (check.status !== "ok") {
    writeFileSync(STATE_FILE, JSON.stringify(emptyState));
    writeMeta({ status: check.status });
    throw new Error(`\n\n[e2e] ${message}\n`); // fails this project → the signed-in projects do not run
  }
  if (message) console.warn(`\n[e2e] ${message}\n`);

  const origin = new URL(baseURL ?? "http://localhost:3000").origin;
  writeFileSync(
    STATE_FILE,
    JSON.stringify({
      cookies: [],
      origins: [{ origin, localStorage: [{ name: ACCESS_KEY, value: check.accessToken }, { name: REFRESH_KEY, value: refreshToken }] }],
    })
  );
  writeMeta({ status: "ok", email: check.user.email, role: check.user.role, daysLeft: check.daysLeft });
  console.log(`[e2e] signed-in account: ${maskEmail(check.user.email)} (${check.user.role}), API ${new URL(apiUrl).host}${check.daysLeft !== null ? `, token valid ${check.daysLeft} more day(s)` : ""}`);
});
