"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  JOB_STATUSES,
  createJob,
  deleteJob,
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
    throw new Error("Price must be a non-negative number.");
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
    throw new Error("Scheduled time is invalid.");
  }
  return date.toISOString();
}

function parseJobForm(formData: FormData): JobInput {
  const customer_id = String(formData.get("customer_id") ?? "").trim();
  if (!customer_id) throw new Error("Customer is required.");

  const statusRaw = String(formData.get("status") ?? "booked");
  const status = JOB_STATUSES.includes(statusRaw as JobStatus)
    ? (statusRaw as JobStatus)
    : "booked";

  return {
    customer_id,
    vehicle_id: optionalString(formData.get("vehicle_id")),
    service_id: optionalString(formData.get("service_id")),
    scheduled_start: optionalDateTime(formData.get("scheduled_start")),
    scheduled_end: optionalDateTime(formData.get("scheduled_end")),
    status,
    price: optionalPrice(formData.get("price")),
    notes: optionalString(formData.get("notes")),
  };
}

export async function createJobAction(formData: FormData) {
  const input = parseJobForm(formData);
  const job = await createJob(input);
  revalidatePath("/app/jobs");
  revalidatePath(`/app/customers/${input.customer_id}`);
  redirect(`/app/jobs/${job.id}`);
}

export async function updateJobAction(id: string, formData: FormData) {
  const input = parseJobForm(formData);
  await updateJob(id, input);
  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${id}`);
  revalidatePath(`/app/customers/${input.customer_id}`);
  redirect(`/app/jobs/${id}`);
}

export async function deleteJobAction(id: string) {
  await deleteJob(id);
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
  await updateJob(id, { status });
  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${id}`);
}
