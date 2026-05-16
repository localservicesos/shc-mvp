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

/** Just the time portion: "2:30 PM". */
export function formatTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Return the calendar date (YYYY-MM-DD) in the given timezone for the
 * provided instant (defaults to now). Uses Intl in 'en-CA' because that
 * locale's short date is ISO-compatible.
 */
export function dateInTimezone(
  tz: string,
  instant: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Get the [startUTC, endUTC) range covering one calendar day in the given
 * timezone. Currently only supports Australia/Brisbane (UTC+10, no DST)
 * which is the MVP business default. Falls back to the same offset for
 * unknown zones; widen this when we add more timezones.
 */
export function dayRangeUtc(
  tz: string,
  date: string = dateInTimezone(tz),
): { startUtc: string; endUtc: string } {
  const offset = tz === "Australia/Brisbane" ? "+10:00" : "+10:00";
  const start = new Date(`${date}T00:00:00${offset}`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}

/**
 * Get the [startUTC, endUTC) range covering N days starting at the given
 * timezone-local date (inclusive).
 */
export function dayRangeFromUtc(
  tz: string,
  startDate: string,
  days: number,
): { startUtc: string; endUtc: string } {
  const { startUtc } = dayRangeUtc(tz, startDate);
  const end = new Date(startUtc);
  end.setUTCDate(end.getUTCDate() + days);
  return { startUtc, endUtc: end.toISOString() };
}
