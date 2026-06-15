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
  JobDisplayStatus,
  JobInput,
  JobStatus,
  JobWithRelations,
} from "@/types/jobs";

export type {
  Job,
  JobDisplayStatus,
  JobInput,
  JobStatus,
  JobWithRelations,
} from "@/types/jobs";
export {
  JOB_DISPLAY_STATUSES,
  JOB_DISPLAY_STATUS_LABELS,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  VEHICLE_CONFLICT_MESSAGE,
  effectiveJobStatus,
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
 * DB exclusion constraint in migration 0011 is the final backstop.
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
    .not("scheduled_start", "is", null)
    // SQL pre-filter: a booking that ended before ours starts can't conflict,
    // and (when we have an end) one starting after ours ends can't either.
    // Conservative superset — intervalsOverlap below stays the authority.
    .or(`scheduled_end.gte.${start},scheduled_end.is.null`);

  if (end) query = query.lt("scheduled_start", end);
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
      throw new Error(`This car is already booked at ${when}.`);
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
  // Accepts the derived display statuses too: `in_progress` and `needs_attention`
  // map to a stored `booked` row plus a scheduled-time window (see queryJobs).
  status?: JobDisplayStatus | "all";
  from?: string;       // local calendar date YYYY-MM-DD in the business timezone
  to?: string;         // local calendar date YYYY-MM-DD in the business timezone
  timezone?: string;   // business timezone — required when from/to are used
  customerId?: string;
};

export type Paged<T> = { rows: T[]; total: number };

export const JOBS_PAGE_SIZE = 50;

async function queryJobs(
  filters: ListJobsFilters,
  range?: { from: number; to: number },
): Promise<Paged<JobWithRelations>> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS, { count: "exact" })
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    // Derived statuses are a `booked` row narrowed by a time window; the stored
    // statuses match the column directly. `now` uses absolute instants so the
    // window stays timezone-safe.
    if (filters.status === "booked") {
      const now = new Date().toISOString();
      // Only jobs that DERIVE to "booked": stored booked AND not currently in
      // their window (in_progress) and not past it (needs_attention). Those two
      // are stored as booked too but belong only to their own filters. A job
      // with no start, or started-but-no-end, conservatively counts as booked.
      query = query
        .eq("status", "booked")
        .or(
          `scheduled_start.gt.${now},scheduled_start.is.null,scheduled_end.is.null`,
        );
    } else if (filters.status === "in_progress") {
      const now = new Date().toISOString();
      query = query
        .eq("status", "booked")
        .lte("scheduled_start", now)
        .gt("scheduled_end", now);
    } else if (filters.status === "needs_attention") {
      const now = new Date().toISOString();
      query = query
        .eq("status", "booked")
        .lt("scheduled_end", now)
        .not("scheduled_end", "is", null);
    } else {
      query = query.eq("status", filters.status);
    }
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
  if (range) {
    query = query.range(range.from, range.to);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob),
    total: count ?? 0,
  };
}

export async function listJobs(
  filters: ListJobsFilters = {},
): Promise<JobWithRelations[]> {
  return (await queryJobs(filters)).rows;
}

/**
 * Page through jobs instead of fetching the whole table. `total` counts every
 * row matching the filters, so the UI can render page controls.
 */
export async function listJobsPaged(
  filters: ListJobsFilters = {},
  page = 1,
  pageSize = JOBS_PAGE_SIZE,
): Promise<Paged<JobWithRelations>> {
  const first = (Math.max(1, page) - 1) * pageSize;
  return queryJobs(filters, { from: first, to: first + pageSize - 1 });
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

  // Moving to a non-booked status (completed/cancelled) releases the slot —
  // no conflict is possible, so skip the current-row lookup entirely. This is
  // the most common update (marking a job done) and now costs one round trip.
  const leavesBooked = input.status !== undefined && input.status !== "booked";

  if (touchesSchedule && !leavesBooked) {
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

  // Guard and delete in one statement: only non-completed jobs match. The
  // returned rows tell us whether anything was deleted, so the happy path is
  // a single round trip instead of select-then-delete.
  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id)
    .neq("status", "completed")
    .select("id");

  if (error?.code === "23503") {
    throw new Error("Delete this job's invoice first.");
  }
  if (error) throw error;

  if ((data ?? []).length === 0) {
    // Nothing deleted — either the job is completed (blocked) or already gone.
    const { data: job } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (job?.status === "completed") {
      throw new Error("Completed jobs can't be deleted.");
    }
  }
}

export async function listJobsForCustomer(
  customerId: string,
): Promise<JobWithRelations[]> {
  return listJobs({ customerId });
}

/**
 * Jobs whose scheduled_start falls in the given UTC range. Used by the
 * Dashboard buckets. `limit` caps the rows fetched while `total` still counts
 * every match, so the UI can show "15 of 230" without transferring 230 rows.
 */
export async function listJobsBetween(
  startUtc: string,
  endUtc: string,
  options: { status?: JobStatus | "all"; limit?: number } = {},
): Promise<Paged<JobWithRelations>> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS, { count: "exact" })
    .gte("scheduled_start", startUtc)
    .lt("scheduled_start", endUtc)
    .order("scheduled_start", { ascending: true });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob),
    total: count ?? 0,
  };
}

/**
 * Jobs that OVERLAP the given UTC range — i.e. they start before the range
 * ends and finish after it begins. Unlike listJobsBetween (start-only), this
 * catches multi-day bookings that began before the range, so the Schedule can
 * render a booking on every day it spans. Jobs without an end are treated as
 * point bookings and included only when their start falls in the range.
 */
export async function listJobsOverlapping(
  startUtc: string,
  endUtc: string,
  options: { status?: JobStatus | "all" } = {},
): Promise<JobWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS)
    .lt("scheduled_start", endUtc)
    .or(
      `scheduled_end.gt.${startUtc},and(scheduled_end.is.null,scheduled_start.gte.${startUtc})`,
    )
    .order("scheduled_start", { ascending: true });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob);
}

/**
 * Jobs with the given status, optionally restricted to scheduled_start >= some
 * UTC instant. `limit` caps the rows fetched; `total` counts every match.
 */
export async function listJobsByStatus(
  status: JobStatus,
  options: { fromUtc?: string; limit?: number } = {},
): Promise<Paged<JobWithRelations>> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS, { count: "exact" })
    .eq("status", status)
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  if (options.fromUtc) {
    query = query.gte("scheduled_start", options.fromUtc);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob),
    total: count ?? 0,
  };
}

/**
 * Booked jobs currently within their scheduled window ("in progress") — stored
 * `booked` AND scheduled_start <= now < scheduled_end. Mirrors the derived
 * `in_progress` display status. `limit` caps the rows; `total` counts all.
 */
export async function listJobsInProgress(
  nowUtc: string,
  options: { limit?: number } = {},
): Promise<Paged<JobWithRelations>> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS, { count: "exact" })
    .eq("status", "booked")
    .lte("scheduled_start", nowUtc)
    .gt("scheduled_end", nowUtc)
    .order("scheduled_end", { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob),
    total: count ?? 0,
  };
}

/**
 * Booked jobs whose scheduled window has already ended ("needs review") — the
 * owner must mark them completed or extend the time. Mirrors the derived
 * `needs_attention` display status: stored `booked` AND scheduled_end < now.
 * `limit` caps the rows fetched while `total` counts every match.
 */
export async function listJobsNeedingReview(
  nowUtc: string,
  options: { limit?: number } = {},
): Promise<Paged<JobWithRelations>> {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(RELATIONS, { count: "exact" })
    .eq("status", "booked")
    .not("scheduled_end", "is", null)
    .lt("scheduled_end", nowUtc)
    .order("scheduled_end", { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: ((data ?? []) as unknown as JobWithRelations[]).map(normalizeJob),
    total: count ?? 0,
  };
}

/**
 * Sum of `price` over jobs with the given status in [startUtc, endUtc).
 * Fetches only the price column — no relations — so the dashboard income
 * card doesn't pay for a full job payload it never renders. (A true SQL
 * SUM() needs PostgREST aggregates enabled or an RPC; this stays portable.)
 */
export async function sumJobPrices(
  startUtc: string,
  endUtc: string,
  status: JobStatus,
): Promise<{ total: number; count: number }> {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("jobs")
    .select("price", { count: "exact" })
    .eq("status", status)
    .gte("scheduled_start", startUtc)
    .lt("scheduled_start", endUtc);

  if (error) throw error;
  return {
    total: (data ?? []).reduce((sum, j) => sum + (j.price ?? 0), 0),
    count: count ?? 0,
  };
}
