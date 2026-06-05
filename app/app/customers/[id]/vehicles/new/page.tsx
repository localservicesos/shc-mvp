import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { getCustomer } from "@/lib/db/customers";
import { createVehicleAction } from "../actions";

export const metadata = {
  title: "New vehicle",
};

export default async function NewVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const action = createVehicleAction.bind(null, customer.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/app/customers/${customer.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {customer.name}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New vehicle for {customer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            submitLabel="Add vehicle"
            successMessage="Vehicle added"
            action={action}
            cancelHref={`/app/customers/${customer.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
