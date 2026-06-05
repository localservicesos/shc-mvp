import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { dayRangeUtc, formatScheduled } from "@/lib/utils/date";
import { toTitleCase } from "@/lib/utils/format";
import {
  VEHICLE_CONFLICT_MESSAGE,
  intervalsOverlap,
} from "@/types/jobs";
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
export {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  VEHICLE_CONFLICT_MESSAGE,
  jobTotal,
} from "@/types/jobs";

const RELATIONS =
  "*, customer:customers(id, name), vehicle:vehicles(id, make, model, year, color, plate), service:services(id, name, base_price)";

/** Title-case the related customer name so it renders consistently everywhere. */
function normalizeJob(job: JobWithRelations): JobWithRelations {
  if (!job.customer) return job;
  return { ...job, customer: { ...job.customer, name: toTitleCase(job.customer.name) } };
}

/**
 * Guard against double-booking the SAME vehicle. Two different cars may share a
 * time slot, but one car cannot be booked for two overlapping times. Only
 * active ("booked") jobs reserve the slot — cancelled/completed jobs don't.
 *
 * No-ops when the job has no vehicle or no start time (nothing to overlap).
 * Throws a friendly error when a conflicting booking exists. This runs on the
 * server (createJob/updateJob), so it can't be bypassed from the client; the
 * DB exclusion constraint in migration 0010 is the final backstop.
 */
async function assertNoVehicleConflict(
  vehicleId: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
  excludeJobId?: string,
): Promise<void> {
  if (!vehicleId || !start) return;

  const startMs = Date.parse(start);
  const endMs = end ? Date.parse(end) : null;
  if (Number.isNaN(startMs)) return;

  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("id, scheduled_start, scheduled_end")
    .eq("vehicle_id", vehicleId)
    .eq("status", "booked")
    .not("scheduled_start", "is", null);

  if (excludeJobId) query = query.neq("id", excludeJobId);

  const { data, error } = await query;
  if (error) throw error;

  for (const job of data ?? []) {
    const otherStart = Date.parse(job.scheduled_start as string);
    if (Number.isNaN(otherStart)) continue;
    const otherEnd = job.scheduled_end
      ? Date.parse(job.scheduled_end as string)
      : null;
    if (intervalsOverlap(startMs, endMs, otherStart, otherEnd)) {
      const when = formatScheduled(job.scheduled_start as string);
      throw new Error(`${VEHICLE_CONFLICT_MESSAGE} (existing booking: ${when})`);
    }
  }
}

/** Postgres exclusion-constraint violation — the DB-level double-booking guard. */
function isVehicleOverlapViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23P01"
  );
}

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
  return ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob);
}

export async function getJob(id: string): Promise<JobWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(RELATIONS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeJob(data as unknown as JobWithRelations) : null;
}

export async function createJob(input: JobInput): Promise<Job> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  if ((input.status ?? "booked") === "booked") {
    await assertNoVehicleConflict(
      input.vehicle_id,
      input.scheduled_start,
      input.scheduled_end,
    );
  }

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
      discount: input.discount ?? 0,
      extra: input.extra ?? 0,
      adjustment_note: input.adjustment_note ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (isVehicleOverlapViolation(error)) throw new Error(VEHICLE_CONFLICT_MESSAGE);
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
  if (input.discount !== undefined) patch.discount = input.discount;
  if (input.extra !== undefined) patch.extra = input.extra;
  if (input.adjustment_note !== undefined)
    patch.adjustment_note = input.adjustment_note;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.cancellation_reason !== undefined)
    patch.cancellation_reason = input.cancellation_reason;

  // Re-check for a same-vehicle double-booking when this update could change
  // which slot the car occupies (vehicle, times, or status). Merge the patch
  // over the current row so omitted fields keep their existing values.
  const touchesSchedule =
    input.vehicle_id !== undefined ||
    input.scheduled_start !== undefined ||
    input.scheduled_end !== undefined ||
    input.status !== undefined;

  if (touchesSchedule) {
    const { data: current } = await supabase
      .from("jobs")
      .select("vehicle_id, scheduled_start, scheduled_end, status")
      .eq("id", id)
      .maybeSingle();

    const nextStatus = (input.status ?? current?.status) as JobStatus;
    if (nextStatus === "booked") {
      await assertNoVehicleConflict(
        input.vehicle_id !== undefined ? input.vehicle_id : current?.vehicle_id,
        input.scheduled_start !== undefined
          ? input.scheduled_start
          : current?.scheduled_start,
        input.scheduled_end !== undefined
          ? input.scheduled_end
          : current?.scheduled_end,
        id,
      );
    }
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (isVehicleOverlapViolation(error)) throw new Error(VEHICLE_CONFLICT_MESSAGE);
  if (error) throw error;
  return data as Job;
}

export async function deleteJob(id: string): Promise<void> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (job?.status === "completed") {
    throw new Error("Completed jobs cannot be deleted.");
  }

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
  return ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob);
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
  return ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob);
}
