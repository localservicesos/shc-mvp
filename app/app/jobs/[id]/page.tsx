import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { JobStatusActions } from "@/components/jobs/status-actions";
import { getJob } from "@/lib/db/jobs";
import { formatMoney } from "@/lib/utils/format";
import { formatScheduled } from "@/lib/utils/date";
import { deleteJobAction } from "../actions";

export const metadata = {
  title: "Job",
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const vehicleText = job.vehicle
    ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
        .filter(Boolean)
        .join(" ") || job.vehicle.plate
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/app/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {job.customer?.name ?? "Job"}
            </h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatScheduled(job.scheduled_start)}
            {job.scheduled_end
              ? ` – ${formatScheduled(job.scheduled_end)}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/app/jobs/${job.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <form action={deleteJobAction.bind(null, job.id)}>
            <Button
              type="submit"
              size="icon"
              variant="destructive"
              aria-label="Delete job"
              title="Delete job"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <JobStatusActions id={job.id} status={job.status} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {job.customer ? (
              <Link
                href={`/app/customers/${job.customer.id}`}
                className="font-medium hover:underline"
              >
                {job.customer.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {vehicleText ? (
              <>
                <p className="font-medium">{vehicleText}</p>
                <p className="text-xs text-muted-foreground">
                  {[job.vehicle?.color, job.vehicle?.plate]
                    .filter(Boolean)
                    .join(" · ") || ""}
                </p>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {job.service?.name ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price</CardTitle>
          </CardHeader>
          <CardContent className="text-sm tabular-nums">
            {job.price !== null ? (
              formatMoney(job.price)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {job.notes ? (
            <p className="whitespace-pre-wrap text-sm">{job.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Coming next — before/after photos via Supabase Storage.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Coming next — generate an invoice when the job is marked ready.
        </CardContent>
      </Card>
    </div>
  );
}
