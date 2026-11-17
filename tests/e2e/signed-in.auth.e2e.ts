import { ACCESS_KEY, REFRESH_KEY, expect, readAuthMeta, refreshTokenFromEnv, test } from "@/tests/_support/e2e";

/* F-18 (specs/_critical-flows.md): the test account is signed in, stays signed in, and a stale access token is
   renewed on its own. Read-only. The token is checked once by tests/_support/auth.setup.ts; if it expired that
   project fails first and says what to replace. With no token at all these tests are skipped. */

const WALL = "Phiên đăng nhập đã hết hạn";
const meta = readAuthMeta();

test.beforeEach(() => {
  test.skip(meta.status !== "ok", "no E2E_REFRESH_TOKEN in .env.e2e.local (signed-in flows skipped)");
});

test("account page opens for the signed-in test account", async ({ page }) => {
  await page.goto("/vi/account");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(meta.email ?? "", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: WALL })).toHaveCount(0);
});

test("the session survives a reload and works on another private page", async ({ page }) => {
  await page.goto("/vi/account");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  /* The page's own title only renders once the session is confirmed, so waiting for it rules out a false pass */
  await page.goto("/vi/wishlist");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: WALL })).toHaveCount(0);
});

test("a stale access token is renewed without asking the user to sign in again", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL ?? "http://localhost:3000").origin;
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [{ origin, localStorage: [{ name: ACCESS_KEY, value: "stale.invalid.token" }, { name: REFRESH_KEY, value: refreshTokenFromEnv() }] }],
    },
  });
  const page = await context.newPage();

  await page.goto("/vi/account");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: WALL })).toHaveCount(0);
  const stored = await page.evaluate((key) => localStorage.getItem(key), ACCESS_KEY);
  expect(stored).not.toBe("stale.invalid.token");
  await context.close();
});
