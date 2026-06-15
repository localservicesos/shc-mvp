import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";
import { JobsTable } from "@/components/jobs/jobs-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { loadSearchIndexAction } from "@/app/app/search-actions";
import {
  JOBS_PAGE_SIZE,
  JOB_DISPLAY_STATUSES,
  JOB_DISPLAY_STATUS_LABELS,
  listJobsPaged,
  type JobDisplayStatus,
} from "@/lib/db/jobs";
import { getCurrentBusiness } from "@/lib/db/current-business";

export const metadata = {
  title: "Jobs",
};

// Includes the derived statuses (in_progress, needs_attention); the data layer
// translates those into a time-windowed query over booked jobs.
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  ...JOB_DISPLAY_STATUSES.map((s) => ({
    value: s,
    label: JOB_DISPLAY_STATUS_LABELS[s],
  })),
];

function buildHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/app/jobs?${qs}` : "/app/jobs";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const status =
    (params.status as JobDisplayStatus | "all" | undefined) ?? "all";
  const from = params.from;
  const to = params.to;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const business = await getCurrentBusiness();
  const timezone = business?.timezone ?? "Australia/Brisbane";

  const { rows: jobs, total } = await listJobsPaged(
    { status, from, to, timezone },
    page,
  );

  return (
    <div className="space-y-6">
      {/* Mobile: row1 = title + button, row2 = full-width subtitle, row3 =
          search. lg: 3 columns with title/subtitle stacked in column 1. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)_minmax(0,1fr)] lg:gap-3">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Button
          asChild
          className="shrink-0 justify-self-end lg:col-start-3 lg:row-span-2 lg:self-center"
        >
          <Link href="/app/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Link>
        </Button>
        <p className="col-span-2 text-sm text-muted-foreground lg:col-span-1 lg:col-start-1 lg:row-start-2">
          Every booking and its current status.
        </p>
        <div className="col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <SearchBar
            scope="jobs"
            loadIndex={loadSearchIndexAction}
            placeholder="Search by customer, plate, or notes…"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-md border bg-background p-1">
          {STATUS_FILTERS.map((f) => {
            const active = (status ?? "all") === f.value;
            return (
              <Link
                key={f.value}
                href={buildHref(params, {
                  status: f.value === "all" ? undefined : f.value,
                  page: undefined, // changing the filter restarts at page 1
                })}
                className={
                  active
                    ? "rounded-sm bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                    : "rounded-sm px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <form
          className="flex flex-wrap items-end gap-2"
          action="/app/jobs"
          method="get"
        >
          {status && status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </label>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
          {from || to ? (
            <Button asChild variant="ghost" size="sm">
              <Link
                href={buildHref(params, {
                  from: undefined,
                  to: undefined,
                  page: undefined,
                })}
              >
                Clear dates
              </Link>
            </Button>
          ) : null}
        </form>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>No jobs match the current filters.</p>
          <p>
            <Link
              href="/app/jobs/new"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Create one
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <JobsTable jobs={jobs} />
          <PaginationControls
            page={page}
            pageSize={JOBS_PAGE_SIZE}
            total={total}
            makeHref={(p) =>
              buildHref(params, { page: p > 1 ? String(p) : undefined })
            }
          />
        </>
      )}
    </div>
  );
}
