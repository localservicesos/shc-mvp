import { describe, it, expect } from "bun:test";
import { jobDateKeys } from "../lib/utils/date";

// Business timezone for the MVP (UTC+10, no DST). Times below use the +10:00
// offset so the local calendar date is unambiguous.
const TZ = "Australia/Brisbane";

describe("jobDateKeys — days a booking spans", () => {
  it("returns a single day for a within-day booking", () => {
    expect(
      jobDateKeys("2026-06-05T09:00:00+10:00", "2026-06-05T11:00:00+10:00", TZ),
    ).toEqual(["2026-06-05"]);
  });

  it("spans the start and end day for a booking crossing midnight", () => {
    // Fri 2:25 pm → Sat 2:24 pm (the case from the schedule).
    expect(
      jobDateKeys("2026-06-05T14:25:00+10:00", "2026-06-06T14:24:00+10:00", TZ),
    ).toEqual(["2026-06-05", "2026-06-06"]);
  });

  it("treats an end exactly at midnight as exclusive (no next day)", () => {
    expect(
      jobDateKeys("2026-06-05T09:00:00+10:00", "2026-06-06T00:00:00+10:00", TZ),
    ).toEqual(["2026-06-05"]);
  });

  it("covers every day for a multi-day booking", () => {
    expect(
      jobDateKeys("2026-06-05T22:00:00+10:00", "2026-06-07T01:00:00+10:00", TZ),
    ).toEqual(["2026-06-05", "2026-06-06", "2026-06-07"]);
  });

  it("returns only the start day when there is no end", () => {
    expect(
      jobDateKeys("2026-06-05T09:00:00+10:00", null, TZ),
    ).toEqual(["2026-06-05"]);
  });

  it("returns only the start day if the end is before the start", () => {
    expect(
      jobDateKeys("2026-06-05T09:00:00+10:00", "2026-06-04T09:00:00+10:00", TZ),
    ).toEqual(["2026-06-05"]);
  });
});
