import { describe, it, expect } from "bun:test";
import {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  type JobStatus,
} from "../types/jobs";

// ---------------------------------------------------------------------------
// Helpers mirroring the business logic in status-actions.tsx and actions.ts
// ---------------------------------------------------------------------------

function getAllowedTransitions(status: JobStatus): JobStatus[] {
  if (status === "booked") return ["completed", "cancelled"];
  return ["booked"]; // completed or cancelled → can reopen
}

function canGenerateInvoice(status: JobStatus): boolean {
  return status === "completed";
}

// Mirror cancelJobAction validation
function validateCancellationReason(reason: string): string | null {
  const trimmed = reason.trim();
  return trimmed ? null : "Cancellation reason is required.";
}

// Mirror the patch built in updateJobStatusAction when reopening
function patchOnReopen(status: Exclude<JobStatus, "cancelled">): {
  status: JobStatus;
  cancellation_reason: null;
} {
  return { status, cancellation_reason: null };
}

// Simulate the migration: what in_progress / ready rows become
function migrateOldStatus(old: string): string {
  if (old === "in_progress" || old === "ready") return "booked";
  return old;
}

// ---------------------------------------------------------------------------
// 1. Shape of the status constants
// ---------------------------------------------------------------------------

describe("JOB_STATUSES constant", () => {
  it("contains exactly 3 statuses", () => {
    expect(JOB_STATUSES.length).toBe(3);
  });

  it("includes booked, completed, cancelled", () => {
    expect(JOB_STATUSES).toContain("booked");
    expect(JOB_STATUSES).toContain("completed");
    expect(JOB_STATUSES).toContain("cancelled");
  });

  it("does NOT include in_progress", () => {
    expect(JOB_STATUSES).not.toContain("in_progress");
  });

  it("does NOT include ready", () => {
    expect(JOB_STATUSES).not.toContain("ready");
  });
});

describe("JOB_STATUS_LABELS", () => {
  it("has a label for every status in JOB_STATUSES", () => {
    for (const s of JOB_STATUSES) {
      expect(JOB_STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it("has no labels for removed statuses", () => {
    const labels = JOB_STATUS_LABELS as Record<string, string>;
    expect(labels["in_progress"]).toBeUndefined();
    expect(labels["ready"]).toBeUndefined();
  });

  it("displays human-readable text (capitalised, no underscores)", () => {
    for (const s of JOB_STATUSES) {
      const label = JOB_STATUS_LABELS[s];
      expect(label).not.toContain("_");
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Status transitions
// ---------------------------------------------------------------------------

describe("status transitions from booked", () => {
  it("can move to completed", () => {
    expect(getAllowedTransitions("booked")).toContain("completed");
  });

  it("can be cancelled", () => {
    expect(getAllowedTransitions("booked")).toContain("cancelled");
  });

  it("cannot jump directly to booked (already booked)", () => {
    expect(getAllowedTransitions("booked")).not.toContain("booked");
  });
});

describe("status transitions from completed", () => {
  it("can be reopened as booked", () => {
    expect(getAllowedTransitions("completed")).toContain("booked");
  });

  it("cannot move to cancelled directly", () => {
    expect(getAllowedTransitions("completed")).not.toContain("cancelled");
  });
});

describe("status transitions from cancelled", () => {
  it("can be reopened as booked", () => {
    expect(getAllowedTransitions("cancelled")).toContain("booked");
  });

  it("cannot move to completed directly", () => {
    expect(getAllowedTransitions("cancelled")).not.toContain("completed");
  });
});

// ---------------------------------------------------------------------------
// 3. Cancellation reason validation
// ---------------------------------------------------------------------------

describe("cancellation reason validation", () => {
  it("accepts a normal reason string", () => {
    expect(validateCancellationReason("Customer rescheduled")).toBeNull();
  });

  it("accepts a reason with surrounding whitespace (trimmed)", () => {
    expect(validateCancellationReason("  Vehicle not available  ")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(validateCancellationReason("")).toBe(
      "Cancellation reason is required.",
    );
  });

  it("rejects a whitespace-only string", () => {
    expect(validateCancellationReason("   ")).toBe(
      "Cancellation reason is required.",
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Reopen clears cancellation_reason
// ---------------------------------------------------------------------------

describe("reopening a cancelled job clears the reason", () => {
  it("sets cancellation_reason to null when moving to booked", () => {
    const patch = patchOnReopen("booked");
    expect(patch.cancellation_reason).toBeNull();
    expect(patch.status).toBe("booked");
  });

  it("sets cancellation_reason to null when moving to completed", () => {
    const patch = patchOnReopen("completed");
    expect(patch.cancellation_reason).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Invoice generation gate
// ---------------------------------------------------------------------------

describe("invoice generation", () => {
  it("is available for completed jobs", () => {
    expect(canGenerateInvoice("completed")).toBe(true);
  });

  it("is NOT available for booked jobs", () => {
    expect(canGenerateInvoice("booked")).toBe(false);
  });

  it("is NOT available for cancelled jobs", () => {
    expect(canGenerateInvoice("cancelled")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Migration — simulate what 0007_simplify_job_statuses.sql does to rows
// ---------------------------------------------------------------------------

describe("migration: old statuses remapped to booked", () => {
  it("maps in_progress -> booked", () => {
    expect(migrateOldStatus("in_progress")).toBe("booked");
  });

  it("maps ready -> booked", () => {
    expect(migrateOldStatus("ready")).toBe("booked");
  });

  it("leaves booked unchanged", () => {
    expect(migrateOldStatus("booked")).toBe("booked");
  });

  it("leaves completed unchanged", () => {
    expect(migrateOldStatus("completed")).toBe("completed");
  });

  it("leaves cancelled unchanged", () => {
    expect(migrateOldStatus("cancelled")).toBe("cancelled");
  });

  it("a batch of mixed old rows all land on valid new statuses", () => {
    const oldRows = ["in_progress", "ready", "booked", "completed", "cancelled"];
    const migrated = oldRows.map(migrateOldStatus);
    for (const status of migrated) {
      expect(["booked", "completed", "cancelled"]).toContain(status);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Full job lifecycle simulations
// ---------------------------------------------------------------------------

describe("full job lifecycle: booked → completed → invoice", () => {
  it("simulates a normal job completing", () => {
    let status: JobStatus = "booked";

    expect(canGenerateInvoice(status)).toBe(false);
    expect(getAllowedTransitions(status)).toContain("completed");

    status = "completed";
    expect(canGenerateInvoice(status)).toBe(true);
  });

  it("simulates cancelling a job with a reason then reopening", () => {
    let status: JobStatus = "booked";
    let cancellation_reason: string | null = null;

    // Attempt cancel with no reason — blocked
    expect(validateCancellationReason("")).not.toBeNull();

    // Cancel with a valid reason
    const reason = "Customer called to reschedule";
    expect(validateCancellationReason(reason)).toBeNull();
    status = "cancelled";
    cancellation_reason = reason;

    expect(status).toBe("cancelled");
    expect(cancellation_reason).toBe(reason);

    // Reopen — reason is cleared
    const patch = patchOnReopen("booked");
    status = patch.status;
    cancellation_reason = patch.cancellation_reason;

    expect(status).toBe("booked");
    expect(cancellation_reason).toBeNull();

    // Now complete it normally
    expect(getAllowedTransitions(status)).toContain("completed");
    status = "completed";
    expect(canGenerateInvoice(status)).toBe(true);
  });

  it("simulates a completed job being reopened", () => {
    let status: JobStatus = "completed";

    expect(getAllowedTransitions(status)).toContain("booked");
    status = "booked";

    expect(canGenerateInvoice(status)).toBe(false);
  });
});
