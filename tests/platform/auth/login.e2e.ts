import { expect, test } from "@/tests/_support/e2e";

/* E2E-1 (specs/platform/auth.md): read-only, so it is safe against any API. Google's popup itself cannot be
   automated; what must hold is that the button stays locked until the visitor accepts the terms. */

test("login page: Google button stays locked until the terms are accepted", async ({ page }) => {
  await page.goto("/vi/login");

  const google = page.getByRole("button", { name: "Tiếp tục với Google" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chào mừng trở lại");
  await expect(google).toBeDisabled();

  await page.getByRole("checkbox").check();
  await expect(google).toBeEnabled();

  await page.getByRole("checkbox").uncheck();
  await expect(google).toBeDisabled();
});

test("login page: no horizontal scroll", async ({ page }) => {
  await page.goto("/vi/login");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
