import { test, expect } from "@playwright/test";

/**
 * Smoke tests: the app loads, we're authenticated (via saved storageState),
 * and every primary nav destination renders without error.
 */
test.describe("smoke — app shell & navigation", () => {
  test("dashboard loads when authenticated", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/);
    // not bounced back to login
    await expect(page).not.toHaveURL(/\/login/);
  });

  const pages = [
    ["/app/customers", /Customers/i],
    ["/app/jobs", /Jobs/i],
    ["/app/schedule", /Schedule/i],
    ["/app/invoices", /Invoices/i],
    ["/app/services", /Services/i],
  ] as const;

  for (const [path, heading] of pages) {
    test(`navigates to ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
      // page renders its heading somewhere
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    });
  }
});
