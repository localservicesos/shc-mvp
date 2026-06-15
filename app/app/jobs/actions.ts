"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  JOB_STATUSES,
  createJob,
  deleteJob,
  getJob,
  updateJob,
  type JobInput,
  type JobStatus,
} from "@/lib/db/jobs";

function optionalString(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "").trim();
  return v ? v : null;
}

function optionalPrice(value: FormDataEntryValue | null): number | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const parsed = Number.parseFloat(v);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error("Enter a valid price.");
  }
  return parsed;
}

/** A discount/extra amount: defaults to 0, must be non-negative. */
function adjustmentAmount(
  value: FormDataEntryValue | null,
  label: string,
): number {
  const v = String(value ?? "").trim();
  if (!v) return 0;
  const parsed = Number.parseFloat(v);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`Enter a valid ${label.toLowerCase()}.`);
  }
  return parsed;
}

function optionalDateTime(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  // datetime-local gives "YYYY-MM-DDTHH:MM" — let Postgres parse it as
  // local time. Supabase stores timestamptz and assumes UTC if no zone is
  // included, so we explicitly append the local zone offset. For MVP we
  // trust the browser's local time matches the business timezone.
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date or time.");
  }
  return date.toISOString();
}

function parseJobForm(formData: FormData): JobInput {
  const customer_id = String(formData.get("customer_id") ?? "").trim();
  if (!customer_id) throw new Error("Pick a customer.");

  const statusRaw = String(formData.get("status") ?? "booked");
  const status = JOB_STATUSES.includes(statusRaw as JobStatus)
    ? (statusRaw as JobStatus)
    : "booked";

  const cancellation_reason =
    status === "cancelled"
      ? optionalString(formData.get("cancellation_reason"))
      : null;

  if (status === "cancelled" && !cancellation_reason) {
    throw new Error("Add a reason to cancel.");
  }

  // A job must always have a start and end time.
  const scheduled_start = optionalDateTime(formData.get("scheduled_start"));
  const scheduled_end = optionalDateTime(formData.get("scheduled_end"));
  if (!scheduled_start || !scheduled_end) {
    throw new Error("Pick a start and end time.");
  }
  if (new Date(scheduled_end) <= new Date(scheduled_start)) {
    throw new Error("End date must be after start date.");
  }

  return {
    customer_id,
    vehicle_id: optionalString(formData.get("vehicle_id")),
    service_id: optionalString(formData.get("service_id")),
    scheduled_start,
    scheduled_end,
    status,
    price: optionalPrice(formData.get("price")),
    discount: adjustmentAmount(formData.get("discount"), "Discount"),
    extra: adjustmentAmount(formData.get("extra"), "Extra"),
    adjustment_note: optionalString(formData.get("adjustment_note")),
    notes: optionalString(formData.get("notes")),
    cancellation_reason,
  };
}

export async function createJobAction(formData: FormData) {
  const input = parseJobForm(formData);
  const job = await createJob(input);
  revalidatePath("/app/jobs");
  revalidatePath(`/app/customers/${input.customer_id}`);
  redirect(`/app/jobs/${job.id}?flash=${encodeURIComponent("Job created")}`);
}

export async function updateJobAction(id: string, formData: FormData) {
  const input = parseJobForm(formData);
  await updateJob(id, input);
  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${id}`);
  revalidatePath(`/app/customers/${input.customer_id}`);
  redirect(`/app/jobs/${id}?flash=${encodeURIComponent("Job updated")}`);
}

export async function deleteJobAction(
  id: string,
  _prev: { error?: string },
): Promise<{ error?: string }> {
  try {
    await deleteJob(id);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete job.",
    };
  }
  revalidatePath("/app/jobs");
  redirect("/app/jobs");
}

export async function updateJobStatusAction(
  id: string,
  status: JobStatus,
): Promise<void> {
  if (!JOB_STATUSES.includes(status)) {
    throw new Error("Invalid status.");
  }
  // Clear cancellation_reason when moving out of cancelled.
  const patch: Parameters<typeof updateJob>[1] = {
    status,
    ...(status !== "cancelled" && { cancellation_reason: null }),
  };
  await updateJob(id, patch);
  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${id}`);
}

/**
 * Set a new scheduled end for a job. Used by the "needs review" prompt when a
 * job runs past its window: the owner picks a new end time and the job lands
 * back in progress. `newEndLocal` is a datetime-local string ("YYYY-MM-DDTHH:MM")
 * parsed as local time, matching the rest of the job form. updateJob re-checks
 * the same-vehicle double-booking guard because the end moved.
 */
export async function extendJobAction(
  id: string,
  newEndLocal: string,
): Promise<void> {
  const newEnd = optionalDateTime(newEndLocal);
  if (!newEnd) throw new Error("Pick a new end time.");

  const job = await getJob(id);
  if (!job) throw new Error("Job not found.");
  if (!job.scheduled_start) throw new Error("This job has no start time.");
  if (new Date(newEnd) <= new Date(job.scheduled_start)) {
    throw new Error("End time must be after the start time.");
  }

  await updateJob(id, { scheduled_end: newEnd });

  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${id}`);
}

export async function cancelJobAction(
  id: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Add a reason to cancel.");
  await updateJob(id, { status: "cancelled", cancellation_reason: trimmed });
  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${id}`);
}
