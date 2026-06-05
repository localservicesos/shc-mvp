import { describe, it, expect } from "bun:test";
import { intervalsOverlap, VEHICLE_CONFLICT_MESSAGE } from "../types/jobs";

// Helper: build epoch-ms from a short "HH:MM" on a fixed day.
const t = (hhmm: string) => Date.parse(`2026-06-10T${hhmm}:00+10:00`);

// ---------------------------------------------------------------------------
// Business rule: same car cannot be booked for two overlapping times.
// Two different cars sharing a slot is allowed and is enforced elsewhere
// (the conflict check is scoped to a single vehicle_id), so these tests only
// exercise the pure interval-overlap logic.
// ---------------------------------------------------------------------------

describe("intervalsOverlap — ranges with both ends", () => {
  it("detects a partial overlap", () => {
    // 9:00–10:00 vs 9:30–10:30
    expect(intervalsOverlap(t("09:00"), t("10:00"), t("09:30"), t("10:30"))).toBe(true);
  });

  it("detects full containment", () => {
    // 9:00–11:00 contains 9:30–10:00
    expect(intervalsOverlap(t("09:00"), t("11:00"), t("09:30"), t("10:00"))).toBe(true);
  });

  it("allows back-to-back bookings (touching, not overlapping)", () => {
    // 9:00–10:00 and 10:00–11:00 — half-open, so no conflict
    expect(intervalsOverlap(t("09:00"), t("10:00"), t("10:00"), t("11:00"))).toBe(false);
  });

  it("allows clearly separate bookings", () => {
    expect(intervalsOverlap(t("09:00"), t("10:00"), t("13:00"), t("14:00"))).toBe(false);
  });
});

describe("intervalsOverlap — missing end times (point bookings)", () => {
  it("flags two bookings at the exact same start", () => {
    expect(intervalsOverlap(t("09:00"), null, t("09:00"), null)).toBe(true);
  });

  it("flags a point that falls inside another booking's range", () => {
    // a point at 9:30 vs a 9:00–10:00 range
    expect(intervalsOverlap(t("09:30"), null, t("09:00"), t("10:00"))).toBe(true);
  });

  it("does not flag two different-start point bookings", () => {
    expect(intervalsOverlap(t("09:00"), null, t("10:00"), null)).toBe(false);
  });

  it("does not flag a point at the exclusive end of a range", () => {
    // range 9:00–10:00 is [9:00, 10:00); a point exactly at 10:00 is outside
    expect(intervalsOverlap(t("10:00"), null, t("09:00"), t("10:00"))).toBe(false);
  });
});

describe("intervalsOverlap — symmetry", () => {
  it("gives the same answer regardless of argument order", () => {
    const a = () => intervalsOverlap(t("09:00"), t("10:00"), t("09:30"), t("10:30"));
    const b = () => intervalsOverlap(t("09:30"), t("10:30"), t("09:00"), t("10:00"));
    expect(a()).toBe(b());
    expect(a()).toBe(true);
  });
});

describe("VEHICLE_CONFLICT_MESSAGE", () => {
  it("is a non-empty, user-facing string", () => {
    expect(VEHICLE_CONFLICT_MESSAGE.length).toBeGreaterThan(0);
    expect(VEHICLE_CONFLICT_MESSAGE).toContain("already booked");
  });
});
