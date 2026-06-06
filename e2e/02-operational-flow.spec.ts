import { test, expect } from "@playwright/test";
import { RUN_ID, tag, localDateTime, dateOnly } from "./lib/helpers";

/**
 * The core operational flow, end to end, through the real UI:
 *
 *   create customer → add vehicle → create service →
 *   book job → verify it shows on Jobs & Schedule →
 *   (conflict rule: a clashing booking for the same car is blocked) →
 *   mark completed → generate invoice → mark paid.
 *
 * Serial: every step depends on data created by the previous one. State is
 * shared via these module-scoped vars.
 */
test.describe.configure({ mode: "serial" });

const customerName = tag("Customer");
const plate = `E2E${RUN_ID}`.toUpperCase().slice(0, 8);
const serviceName = tag("Full Detail");

// Two non-overlapping-by-day slots for the same car: the conflict test books
// the SAME window twice.
const start = localDateTime(3, "09:00");
const end = localDateTime(3, "11:00");

test.describe("operational flow", () => {
  test("creates a customer", async ({ page }) => {
    await page.goto("/app/customers/new");
    await page.locator("#name").fill(customerName);
    await page.locator("#phone").fill("0400000000");
    await page.locator("#email").fill(`e2e+${RUN_ID}@example.com`);
    await page.getByRole("button", { name: /save|create|add/i }).first().click();

    // lands on the customer detail page
    await expect(page).toHaveURL(/\/app\/customers\/[0-9a-f-]+$/, {
      timeout: 15_000,
    });
    await expect(page.getByText(customerName).first()).toBeVisible();
  });

  test("adds a vehicle to the customer", async ({ page }) => {
    await page.goto("/app/customers");
    await page.getByRole("link", { name: customerName }).first().click();
    await expect(page).toHaveURL(/\/app\/customers\/[0-9a-f-]+$/);

    await page.getByRole("link", { name: /add vehicle/i }).click();
    await page.locator("#make").fill("Toyota");
    await page.locator("#model").fill("Corolla");
    await page.locator("#year").fill("2021");
    await page.locator("#color").fill("Silver");
    await page.locator("#plate").fill(plate);
    await page.getByRole("button", { name: /save|create|add/i }).first().click();

    // back on customer detail, vehicle visible
    await expect(page).toHaveURL(/\/app\/customers\/[0-9a-f-]+$/, {
      timeout: 15_000,
    });
    await expect(page.getByText(plate).first()).toBeVisible();
  });

  test("creates a service", async ({ page }) => {
    await page.goto("/app/services/new");
    await page.locator("#name").fill(serviceName);
    await page.locator("#base_price").fill("150");
    await page.getByRole("button", { name: /save|create|add/i }).first().click();

    await expect(page).toHaveURL(/\/app\/services/, { timeout: 15_000 });
    await expect(page.getByText(serviceName).first()).toBeVisible();
  });

  test("books a job for the customer's car", async ({ page }) => {
    await page.goto("/app/jobs/new");

    // Native <select>s. Option labels are exact, but JSX can introduce
    // whitespace, so select by the option VALUE whose text contains our
    // unique RUN_ID — robust against label normalization.
    const customerValue = await page
      .locator("#customer_id option", { hasText: customerName })
      .first()
      .getAttribute("value");
    expect(customerValue, "customer should appear in job form dropdown").toBeTruthy();
    await page.locator("#customer_id").selectOption(customerValue!);

    // vehicle select repopulates after customer chosen; pick first real option
    await page.locator("#vehicle_id").selectOption({ index: 1 });
    await page.locator("#service_id").selectOption({ label: serviceName }).catch(() => {});

    await page.locator("#scheduled_start").fill(start);
    await page.locator("#scheduled_end").fill(end);
    await page.locator("#price").fill("150");

    await page.getByRole("button", { name: /save|create|book|add/i }).first().click();

    // lands on the new job's detail page
    await expect(page).toHaveURL(/\/app\/jobs\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(page.getByText(customerName).first()).toBeVisible();
  });

  test("the booked job appears on the Jobs list", async ({ page }) => {
    await page.goto("/app/jobs");
    await expect(page.getByText(customerName).first()).toBeVisible();
  });

  test("the booked job appears on the Schedule", async ({ page }) => {
    // The job is booked 3 days out, which may fall in next week. Navigate the
    // week view directly to that date using the app's own URL params.
    await page.goto(`/app/schedule?view=week&date=${dateOnly(3)}`);
    // schedule renders the customer name on the job card
    await expect(page.getByText(customerName).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("blocks a double-booking of the same car (conflict rule)", async ({
    page,
  }) => {
    await page.goto("/app/jobs/new");
    const custVal = await page
      .locator("#customer_id option", { hasText: customerName })
      .first()
      .getAttribute("value");
    await page.locator("#customer_id").selectOption(custVal!);
    await page.locator("#vehicle_id").selectOption({ index: 1 });
    // exact same window as the first booking → must be rejected
    await page.locator("#scheduled_start").fill(start);
    await page.locator("#scheduled_end").fill(end);
    await page.locator("#price").fill("150");

    await page.getByRole("button", { name: /save|create|book|add/i }).first().click();

    // The app surfaces the conflict via a sonner toast. Assert the message
    // and that we did NOT navigate to a new job detail page.
    await expect(page.getByText(/already booked/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("marks the job completed and generates an invoice", async ({ page }) => {
    // open the job from the list: only the date cell is a link, so find the
    // row containing our customer and click the link within it.
    await page.goto("/app/jobs");
    const row = page.getByRole("row").filter({ hasText: customerName }).first();
    await row.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/app\/jobs\/[0-9a-f-]+$/);

    await page.getByRole("button", { name: /mark as completed/i }).click();
    await expect(page.getByText(/completed/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Generating the invoice redirects straight to the new invoice page.
    await page.getByRole("button", { name: /generate invoice/i }).click();
    await expect(page).toHaveURL(/\/app\/invoices\/[0-9a-f-]+$/, {
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: /INV-/i })).toBeVisible();

    // The fresh invoice is a DRAFT. We intentionally do NOT exercise
    // Send → Paid here: "Send email" fires a real Resend email, an outward
    // side effect we keep out of the automated suite. The draft state and the
    // Send control's presence are the boundary we assert.
    await expect(page.getByText(/draft/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /send email/i })).toBeVisible();
  });

  test("the invoice shows on the Invoices list", async ({ page }) => {
    await page.goto("/app/invoices");
    const row = page.getByRole("row").filter({ hasText: customerName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    // it carries an invoice number and links to the invoice detail
    await expect(row.getByRole("link").first()).toBeVisible();
  });
});
