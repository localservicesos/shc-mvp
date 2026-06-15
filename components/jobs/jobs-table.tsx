import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { formatMoney } from "@/lib/utils/format";
import { formatScheduled } from "@/lib/utils/date";
import {
  effectiveJobStatus,
  jobTotal,
  type JobDisplayStatus,
  type JobWithRelations,
} from "@/types/jobs";

// Subtle per-status row tint so the status reads at a glance even where
// the badge column is tight.
const ROW_TINT: Record<JobDisplayStatus, string> = {
  booked: "bg-blue-500/15",
  in_progress: "bg-yellow-400/30",
  needs_attention: "bg-orange-600/40",
  completed: "bg-emerald-500/15",
  cancelled: "bg-rose-500/20",
};

// Server component on purpose: rows render to HTML once instead of being
// shipped a second time as serialized client-component props.
export function JobsTable({ jobs }: { jobs: JobWithRelations[] }) {
  const rows = jobs;
  // Snapshot "now" once so every row derives in_progress/needs_attention against
  // the same instant.
  const now = new Date().getTime();

  return (
    <div className="rounded-md border">
      {/* Smaller text on tablet, where date/customer/vehicle/plate/status
          must share the narrow space; Service and Total wait for lg. */}
      <Table className="md:max-lg:text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Vehicle</TableHead>
            <TableHead className="hidden md:table-cell">Plate</TableHead>
            <TableHead className="hidden lg:table-cell">Service</TableHead>
            <TableHead className="text-right md:max-lg:hidden">Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No jobs to show.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((job) => {
              const vehicleText = job.vehicle
                ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                    .filter(Boolean)
                    .join(" ") || job.vehicle.plate
                : "—";
              const displayStatus = effectiveJobStatus(job, now);
              return (
                <TableRow key={job.id} className={ROW_TINT[displayStatus]}>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="hover:underline"
                    >
                      {formatScheduled(job.scheduled_start)}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-normal font-medium">
                    {job.customer?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {vehicleText ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono">
                    {job.vehicle?.plate ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {job.service?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums md:max-lg:hidden">
                    {job.price !== null || job.discount > 0 || job.extra > 0
                      ? formatMoney(jobTotal(job))
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <JobStatusBadge status={displayStatus} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
