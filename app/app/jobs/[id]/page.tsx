import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { JobStatusActions } from "@/components/jobs/status-actions";
import { getJob, jobTotal } from "@/lib/db/jobs";
import { getInvoiceByJob } from "@/lib/db/invoices";
import { listJobPhotos } from "@/lib/db/job-photos";
import { formatMoney } from "@/lib/utils/format";
import { formatScheduled } from "@/lib/utils/date";
import { generateInvoiceFromJobAction } from "@/app/app/invoices/actions";
import { DeleteJobButton } from "./_components/delete-job-button";
import { uploadJobPhotoAction } from "./photos/actions";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { PhotoUploader } from "@/components/jobs/photo-uploader";
import { PhotoGrid } from "@/components/jobs/photo-grid";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Job",
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // All three queries key off the route id alone, so they can share one
  // round-trip window instead of waiting for the job row first.
  const [job, invoice, photos] = await Promise.all([
    getJob(id),
    getInvoiceByJob(id),
    listJobPhotos(id),
  ]);
  if (!job) notFound();

  const uploadAction = uploadJobPhotoAction.bind(null, job.id);
  
  {/* Feature Flag: Photos Section = false */}
  const showPhotos = false;

  const hasAdjustment = job.discount > 0 || job.extra > 0;
  const total = jobTotal(job);

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
          <DeleteJobButton jobId={job.id} status={job.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <JobStatusActions id={job.id} status={job.status} />
          {job.status === "cancelled" ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                Cancellation reason
              </p>
              <p className="mt-0.5 text-sm text-rose-800 dark:text-rose-300">
                {job.cancellation_reason ?? (
                  <span className="italic opacity-60">No reason recorded.</span>
                )}
              </p>
            </div>
          ) : null}
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
            <CardTitle className="text-base">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {job.price === null && !hasAdjustment ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Base price</span>
                  <span className="tabular-nums">{formatMoney(job.price)}</span>
                </div>
                {job.discount > 0 ? (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      −{formatMoney(job.discount)}
                    </span>
                  </div>
                ) : null}
                {job.extra > 0 ? (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Extra charge</span>
                    <span className="tabular-nums">
                      +{formatMoney(job.extra)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t pt-1.5 font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMoney(total)}</span>
                </div>
                {job.adjustment_note ? (
                  <p className="pt-1 text-xs text-muted-foreground">
                    {job.adjustment_note}
                  </p>
                ) : null}
              </>
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
      
      {showPhotos ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PhotoUploader action={uploadAction} />
            <PhotoGrid jobId={job.id} photos={photos} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Invoice</CardTitle>
          {invoice ? (
            <InvoiceStatusBadge status={invoice.status} />
          ) : null}
        </CardHeader>
        <CardContent>
          {invoice ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{invoice.invoice_number}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(invoice.amount)}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/invoices/${invoice.id}`}>
                  Open invoice
                </Link>
              </Button>
            </div>
          ) :job.status === "completed" ? (
            <form action={generateInvoiceFromJobAction.bind(null, job.id)}>
              <Button type="submit" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Generate invoice
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Mark the job as <strong>completed</strong> to generate an invoice.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
