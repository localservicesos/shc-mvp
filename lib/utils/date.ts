/**
 * Convert an ISO timestamp to the value format expected by an
 * <input type="datetime-local"> ("YYYY-MM-DDTHH:MM"). Returns an empty
 * string if the input is null/invalid.
 *
 * Uses the local timezone (the browser/server runtime), which for the MVP
 * we assume matches the business timezone (Australia/Brisbane).
 */
export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** "Wed 20 May, 2:30 PM" — used for at-a-glance scheduled time display. */
export function formatScheduled(iso: string | null): string {
  if (!iso) return "Unscheduled";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
