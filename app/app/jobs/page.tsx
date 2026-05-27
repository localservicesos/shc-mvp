import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  listJobs,
  type JobStatus,
} from "@/lib/db/jobs";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { formatMoney } from "@/lib/utils/format";
import { formatScheduled } from "@/lib/utils/date";

export const metadata = {
  title: "Jobs",
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  ...JOB_STATUSES.map((s) => ({ value: s, label: JOB_STATUS_LABELS[s] })),
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
  const status = (params.status as JobStatus | "all" | undefined) ?? "all";
  const from = params.from;
  const to = params.to;

  const business = await getCurrentBusiness();
  const timezone = business?.timezone ?? "Australia/Brisbane";

  const jobs = await listJobs({ status, from, to, timezone });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Every booking and its current status.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Link>
        </Button>
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
                })}
                className={
                  active
                    ? "rounded-sm bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                    : "rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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
              <Link href={buildHref(params, { from: undefined, to: undefined })}>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Vehicle</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const vehicleText = job.vehicle
                  ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                      .filter(Boolean)
                      .join(" ") || job.vehicle.plate
                  : "—";
                return (
                  <TableRow key={job.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="hover:underline"
                      >
                        {formatScheduled(job.scheduled_start)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {job.customer?.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {vehicleText ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {job.service?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.price !== null ? formatMoney(job.price) : "—"}
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
