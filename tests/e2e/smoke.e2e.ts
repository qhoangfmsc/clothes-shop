import { expect, test } from "@/tests/_support/e2e";

/* Cross-module smoke: the public pages answer and render without the error boundary. Read-only. */

for (const path of ["/vi", "/en", "/vi/shop", "/vi/login"]) {
  test(`${path} renders`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/application error|internal server error/i)).toHaveCount(0);
  });
}
