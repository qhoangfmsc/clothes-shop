import { expect, test } from "@/tests/_support/e2e";

/* F-17 (specs/_critical-flows.md): a visitor who is not signed in cannot use the private pages — each shows the
   sign-in wall instead of the content. Signed out, read-only, no token needed. */

const WALL = "Phiên đăng nhập đã hết hạn";

for (const path of ["/vi/account", "/vi/cart", "/vi/orders", "/vi/wishlist"]) {
  test(`${path} shows the sign-in wall to a visitor`, async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole("heading", { name: WALL })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tiếp tục với Google" })).toBeDisabled();
  });
}

test("the wall fits the screen (no horizontal scroll)", async ({ page }) => {
  await page.goto("/vi/account");
  await expect(page.getByRole("heading", { name: WALL })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
