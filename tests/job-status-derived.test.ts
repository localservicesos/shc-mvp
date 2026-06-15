import { describe, it, expect } from "bun:test";
import { effectiveJobStatus, type JobStatus } from "../types/jobs";

// Fixed window: 10:00–12:00 UTC on a fixed day. Comparisons are absolute
// instants, so the runtime timezone is irrelevant.
const START = "2026-06-13T10:00:00.000Z";
const END = "2026-06-13T12:00:00.000Z";
const ms = (iso: string) => Date.parse(iso);

function job(
  status: JobStatus,
  scheduled_start: string | null = START,
  scheduled_end: string | null = END,
) {
  return { status, scheduled_start, scheduled_end };
}

describe("effectiveJobStatus — booked job derives from the clock", () => {
  it("is booked before the window starts", () => {
    expect(effectiveJobStatus(job("booked"), ms("2026-06-13T09:59:59.000Z"))).toBe(
      "booked",
    );
  });

  it("is in_progress at the exact start (window is half-open [start, end))", () => {
    expect(effectiveJobStatus(job("booked"), ms(START))).toBe("in_progress");
  });

  it("is in_progress in the middle of the window", () => {
    expect(effectiveJobStatus(job("booked"), ms("2026-06-13T11:00:00.000Z"))).toBe(
      "in_progress",
    );
  });

  it("is needs_attention at the exact end (end is exclusive)", () => {
    expect(effectiveJobStatus(job("booked"), ms(END))).toBe("needs_attention");
  });

  it("is needs_attention after the window has ended", () => {
    expect(effectiveJobStatus(job("booked"), ms("2026-06-13T13:00:00.000Z"))).toBe(
      "needs_attention",
    );
  });
});

describe("effectiveJobStatus — terminal statuses are never derived", () => {
  it("completed stays completed even inside the window", () => {
    expect(effectiveJobStatus(job("completed"), ms("2026-06-13T11:00:00.000Z"))).toBe(
      "completed",
    );
  });

  it("cancelled stays cancelled even after the window", () => {
    expect(effectiveJobStatus(job("cancelled"), ms("2026-06-13T13:00:00.000Z"))).toBe(
      "cancelled",
    );
  });
});

describe("effectiveJobStatus — incomplete scheduling falls back to booked", () => {
  it("is booked when there is no start", () => {
    expect(effectiveJobStatus(job("booked", null, END), ms("2026-06-13T11:00:00.000Z"))).toBe(
      "booked",
    );
  });

  it("is booked when there is no end (legacy/seed rows), even once started", () => {
    expect(effectiveJobStatus(job("booked", START, null), ms("2026-06-13T11:00:00.000Z"))).toBe(
      "booked",
    );
  });

  it("is booked when the start is unparseable", () => {
    expect(effectiveJobStatus(job("booked", "not-a-date", END), ms("2026-06-13T11:00:00.000Z"))).toBe(
      "booked",
    );
  });
});
