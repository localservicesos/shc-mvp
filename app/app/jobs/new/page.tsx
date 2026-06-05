import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobForm } from "@/components/forms/job-form";
import { listCustomers } from "@/lib/db/customers";
import { listAllVehicles } from "@/lib/db/vehicles";
import { listActiveServices } from "@/lib/db/services";
import { createJobAction } from "../actions";

export const metadata = {
  title: "New job",
};

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; vehicle_id?: string }>;
}) {
  const params = await searchParams;
  const [customers, vehicles, services] = await Promise.all([
    listCustomers(),
    listAllVehicles(),
    listActiveServices(),
  ]);

  if (customers.length === 0) {
    redirect("/app/customers/new");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/app/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New job</CardTitle>
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
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              base_price: s.base_price,
            }))}
            initial={{
              customer_id: params.customer_id ?? "",
              vehicle_id: params.vehicle_id ?? "",
            }}
            lockCustomer={Boolean(params.customer_id)}
            submitLabel="Create job"
            successMessage="Job created"
            action={createJobAction}
            cancelHref="/app/jobs"
          />
        </CardContent>
      </Card>
    </div>
  );
}
