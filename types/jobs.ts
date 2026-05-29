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
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

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
  notes?: string | null;
  cancellation_reason?: string | null;
};
