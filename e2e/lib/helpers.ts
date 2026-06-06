import { type Page, expect } from "@playwright/test";

/** Unique suffix so reruns never collide and rows are easy to spot. */
export const RUN_ID = `${Date.now().toString(36)}`;

export const tag = (label: string) => `__E2E__ ${label} ${RUN_ID}`;

/**
 * A datetime-local string ("YYYY-MM-DDTHH:MM") `daysFromNow` ahead at `hhmm`.
 * Used to fill the job form's <input type="datetime-local"> fields.
 */
export function localDateTime(daysFromNow: number, hhmm: string): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hhmm}`;
}

/** "YYYY-MM-DD" for `daysFromNow` ahead — matches the schedule's ?date= param. */
export function dateOnly(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Wait for client-side navigation to settle on a URL matching `re`. */
export async function expectUrl(page: Page, re: RegExp) {
  await expect(page).toHaveURL(re, { timeout: 15_000 });
}
