/**
 * Job-related types and constants that are safe to import from both
 * server and client components. The actual data-access functions live
 * in `lib/db/jobs.ts` (server-only).
 */
import type { Customer } from "@/lib/db/customers";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Service } from "@/lib/db/services";

export const JOB_STATUSES = [
  "booked",
  "completed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type Job = {
  id: string;
  business_id: string;
  customer_id: string;
  vehicle_id: string | null;
  service_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: JobStatus;
  price: number | null;
  discount: number;
  extra: number;
  adjustment_note: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * The job's final total: base price, minus a fixed discount, plus a fixed
 * extra charge. Never negative. This is the single source of truth used by
 * both the job detail view and invoice generation.
 */
export function jobTotal(job: {
  price: number | null;
  discount?: number | null;
  extra?: number | null;
}): number {
  const base = job.price ?? 0;
  const total = base - (job.discount ?? 0) + (job.extra ?? 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

export type JobWithRelations = Job & {
  customer: Pick<Customer, "id" | "name"> | null;
  vehicle: Pick<
    Vehicle,
    "id" | "make" | "model" | "year" | "color" | "plate"
  > | null;
  service: Pick<Service, "id" | "name" | "base_price"> | null;
};

export type JobInput = {
  customer_id: string;
  vehicle_id?: string | null;
  service_id?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  status?: JobStatus;
  price?: number | null;
  discount?: number | null;
  extra?: number | null;
  adjustment_note?: string | null;
  notes?: string | null;
  cancellation_reason?: string | null;
};
