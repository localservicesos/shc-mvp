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
import { jobTotal, type JobWithRelations } from "@/types/jobs";

// Server component on purpose: rows render to HTML once instead of being
// shipped a second time as serialized client-component props.
export function JobsTable({ jobs }: { jobs: JobWithRelations[] }) {
  const rows = jobs;

  // Rows are chronological (oldest first), so on load anchor the viewport at
  // the first job of today (or the next upcoming one) — earlier jobs stay
  // reachable by scrolling up.
  const todayStartTs = todayStartUtc ? new Date(todayStartUtc).getTime() : NaN;
  const anchorIndex = Number.isNaN(todayStartTs)
    ? -1
    : rows.findIndex(
        (j) =>
          j.scheduled_start &&
          new Date(j.scheduled_start).getTime() >= todayStartTs,
      );
  const anchorRef = React.useRef<HTMLTableRowElement | null>(null);
  const didScroll = React.useRef(false);
  React.useEffect(() => {
    if (didScroll.current || !anchorRef.current) return;
    didScroll.current = true;
    anchorRef.current.scrollIntoView({ block: "start" });
  }, []);

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
            rows.map((job, i) => {
              const vehicleText = job.vehicle
                ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                    .filter(Boolean)
                    .join(" ") || job.vehicle.plate
                : "—";
              return (
                <TableRow
                  key={job.id}
                  ref={i === anchorIndex ? anchorRef : undefined}
                  // Leave room above the anchored row for the table header.
                  className={cn(ROW_TINT[job.status], "scroll-mt-10")}
                >
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
                    <JobStatusBadge status={job.status} />
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
