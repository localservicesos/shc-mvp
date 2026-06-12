import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCustomer } from "@/lib/db/customers";
import { describeVehicle, listVehiclesForCustomer } from "@/lib/db/vehicles";
import { listJobsForCustomer } from "@/lib/db/jobs";
import { formatScheduled } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/format";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { deleteVehicleAction } from "./vehicles/actions";
import { DeleteCustomerButton } from "./_components/delete-customer-button";

export const metadata = {
  title: "Customer",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // All three queries key off the route id alone, so they can share one
  // round-trip window instead of waiting for the customer row first.
  const [customer, vehicles, jobs] = await Promise.all([
    getCustomer(id),
    listVehiclesForCustomer(id),
    listJobsForCustomer(id),
  ]);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/app/customers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            Added {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/app/customers/${customer.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteCustomerButton customerId={customer.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Phone" value={customer.phone} />
            <Field label="Email" value={customer.email} />
            <Field label="Address" value={customer.address} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.notes ? (
              <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Vehicles</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/app/customers/${customer.id}/vehicles/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add vehicle
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No vehicles yet for this customer.
            </p>
          ) : (
            <ul className="divide-y">
              {vehicles.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {describeVehicle(v)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[v.color, v.plate].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {v.notes ? (
                      <p className="whitespace-pre-wrap pt-1 text-xs text-muted-foreground">
                        {v.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button asChild size="icon" variant="ghost">
                      <Link
                        href={`/app/customers/${customer.id}/vehicles/${v.id}/edit`}
                        aria-label="Edit vehicle"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <ConfirmDeleteButton
                      action={deleteVehicleAction.bind(null, customer.id, v.id)}
                      label="Delete vehicle"
                      title="Delete this vehicle?"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Job history</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/app/jobs/new?customer_id=${customer.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              New job
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No jobs yet for this customer.
            </p>
          ) : (
            <ul className="divide-y">
              {jobs.map((job) => {
                const vehicleText = job.vehicle
                  ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                      .filter(Boolean)
                      .join(" ") || job.vehicle.plate
                  : null;
                return (
                  <li
                    key={job.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {formatScheduled(job.scheduled_start)}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {[job.service?.name, vehicleText]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {job.price !== null ? (
                        <span className="text-sm tabular-nums">
                          {formatMoney(job.price)}
                        </span>
                      ) : null}
                      <JobStatusBadge status={job.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p>{value ?? "—"}</p>
    </div>
  );
}
