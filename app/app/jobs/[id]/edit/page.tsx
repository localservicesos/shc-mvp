import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobForm } from "@/components/forms/job-form";
import { getJob } from "@/lib/db/jobs";
import { listCustomers } from "@/lib/db/customers";
import { listAllVehicles } from "@/lib/db/vehicles";
import { listActiveServices } from "@/lib/db/services";
import { toDateTimeLocalValue } from "@/lib/utils/date";
import { updateJobAction } from "../../actions";

export const metadata = {
  title: "Edit job",
};

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, customers, vehicles, services] = await Promise.all([
    getJob(id),
    listCustomers(),
    listAllVehicles(),
    listActiveServices(),
  ]);
  if (!job) notFound();

  // Include the assigned service even if it's inactive, so the picker can
  // still show its current value without forcing the user to reassign.
  const servicePool = job.service && !services.some((s) => s.id === job.service?.id)
    ? [
        ...services,
        { id: job.service.id, name: job.service.name, base_price: job.service.base_price, active: true } as never,
      ]
    : services;

  const action = updateJobAction.bind(null, job.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/app/jobs/${job.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to job
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit job</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            vehicles={vehicles.map((v) => ({
              id: v.id,
              customer_id: v.customer_id,
              make: v.make,
              model: v.model,
              year: v.year,
              plate: v.plate,
            }))}
            services={servicePool.map((s) => ({
              id: s.id,
              name: s.name,
              base_price: s.base_price,
            }))}
            initial={{
              customer_id: job.customer_id,
              vehicle_id: job.vehicle_id ?? "",
              service_id: job.service_id ?? "",
              scheduled_start: toDateTimeLocalValue(job.scheduled_start),
              scheduled_end: toDateTimeLocalValue(job.scheduled_end),
              status: job.status,
              price: job.price !== null ? job.price.toString() : "",
              discount: job.discount ? job.discount.toString() : "",
              extra: job.extra ? job.extra.toString() : "",
              adjustment_note: job.adjustment_note ?? "",
              notes: job.notes ?? "",
              cancellation_reason: job.cancellation_reason ?? "",
            }}
            showStatus
            submitLabel="Save changes"
            successMessage="Job updated"
            action={action}
            cancelHref={`/app/jobs/${job.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
