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
import { describeVehicle, getVehicle } from "@/lib/db/vehicles";
import { updateVehicleAction } from "../../actions";

export const metadata = {
  title: "Edit vehicle",
};

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string; vehicleId: string }>;
}) {
  const { id, vehicleId } = await params;
  const [customer, vehicle] = await Promise.all([
    getCustomer(id),
    getVehicle(vehicleId),
  ]);
  if (!customer || !vehicle || vehicle.customer_id !== customer.id) {
    notFound();
  }

  const action = updateVehicleAction.bind(null, customer.id, vehicle.id);

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
          <CardTitle>Edit {describeVehicle(vehicle)}</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            initial={{
              make: vehicle.make ?? "",
              model: vehicle.model ?? "",
              year: vehicle.year?.toString() ?? "",
              color: vehicle.color ?? "",
              plate: vehicle.plate ?? "",
              notes: vehicle.notes ?? "",
            }}
            submitLabel="Save changes"
            action={action}
            cancelHref={`/app/customers/${customer.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
