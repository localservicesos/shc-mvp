import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { dayRangeUtc } from "@/lib/utils/date";
import type {
  Job,
  JobInput,
  JobStatus,
  JobWithRelations,
} from "@/types/jobs";

export type {
  Job,
  JobInput,
  JobStatus,
  JobWithRelations,
} from "@/types/jobs";
export { JOB_STATUSES, JOB_STATUS_LABELS } from "@/types/jobs";

const RELATIONS =
  "*, customer:customers(id, name), vehicle:vehicles(id, make, model, year, color, plate), service:services(id, name, base_price)";

export type ListJobsFilters = {
  status?: JobStatus | "all";
  from?: string;       // local calendar date YYYY-MM-DD in the business timezone
  to?: string;         // local calendar date YYYY-MM-DD in the business timezone
  timezone?: string;   // business timezone — required when from/to are used
  customerId?: string;
};

export async function listJobs(
  filters: ListJobsFilters = {},
): Promise<JobWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS)
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.from) {
    const tz = filters.timezone ?? "Australia/Brisbane";
    const { startUtc } = dayRangeUtc(tz, filters.from);
    query = query.gte("scheduled_start", startUtc);
  }
  if (filters.to) {
    const tz = filters.timezone ?? "Australia/Brisbane";
    const { endUtc } = dayRangeUtc(tz, filters.to);
    query = query.lte("scheduled_start", endUtc);
  }
  if (filters.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as JobWithRelations[];
}

export async function getJob(id: string): Promise<JobWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(RELATIONS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as JobWithRelations | null;
}

export async function createJob(input: JobInput): Promise<Job> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      business_id: business.id,
      customer_id: input.customer_id,
      vehicle_id: input.vehicle_id ?? null,
      service_id: input.service_id ?? null,
      scheduled_start: input.scheduled_start ?? null,
      scheduled_end: input.scheduled_end ?? null,
      status: input.status ?? "booked",
      price: input.price ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Job;
}

export async function updateJob(
  id: string,
  input: Partial<JobInput>,
): Promise<Job> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.customer_id !== undefined) patch.customer_id = input.customer_id;
  if (input.vehicle_id !== undefined) patch.vehicle_id = input.vehicle_id;
  if (input.service_id !== undefined) patch.service_id = input.service_id;
  if (input.scheduled_start !== undefined)
    patch.scheduled_start = input.scheduled_start;
  if (input.scheduled_end !== undefined)
    patch.scheduled_end = input.scheduled_end;
  if (input.status !== undefined) patch.status = input.status;
  if (input.price !== undefined) patch.price = input.price;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Job;
}

export async function deleteJob(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error?.code === "23503") {
    throw new Error(
      "This job has an invoice. Void or delete the invoice first, then delete the job.",
    );
  }
  if (error) throw error;
}

export async function listJobsForCustomer(
  customerId: string,
): Promise<JobWithRelations[]> {
  return listJobs({ customerId });
}

/**
 * Jobs whose scheduled_start falls in the given UTC range. Used by the
 * Dashboard (today bucket) and the Schedule view.
 */
export async function listJobsBetween(
  startUtc: string,
  endUtc: string,
  options: { status?: JobStatus | "all" } = {},
): Promise<JobWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS)
    .gte("scheduled_start", startUtc)
    .lt("scheduled_start", endUtc)
    .order("scheduled_start", { ascending: true });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as JobWithRelations[];
}

/** Jobs with the given status, optionally restricted to scheduled_start >= some UTC instant. */
export async function listJobsByStatus(
  status: JobStatus,
  options: { fromUtc?: string } = {},
): Promise<JobWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS)
    .eq("status", status)
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  if (options.fromUtc) {
    query = query.gte("scheduled_start", options.fromUtc);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as JobWithRelations[];
}
