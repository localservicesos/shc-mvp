"use client";

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
import { useFilteredIds } from "@/components/search/search-filter-context";
import { formatMoney } from "@/lib/utils/format";
import { formatScheduled } from "@/lib/utils/date";
import type { JobWithRelations } from "@/types/jobs";
import type { SearchIndexItem } from "@/types/search";

export function JobsTable({
  jobs,
  index,
}: {
  jobs: JobWithRelations[];
  index: SearchIndexItem[];
}) {
  const ids = useFilteredIds(index);
  const rows = ids ? jobs.filter((j) => ids.has(j.id)) : jobs;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Vehicle</TableHead>
            <TableHead className="hidden md:table-cell">Plate</TableHead>
            <TableHead className="hidden md:table-cell">Service</TableHead>
            <TableHead className="text-right">Price</TableHead>
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
                No jobs match your search.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((job) => {
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
                  <TableCell className="hidden md:table-cell font-mono">
                    {job.vehicle?.plate ?? "—"}
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
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
