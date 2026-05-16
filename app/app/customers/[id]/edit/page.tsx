import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomerForm } from "@/components/forms/customer-form";
import { getCustomer } from "@/lib/db/customers";
import { updateCustomerAction } from "../../actions";

export const metadata = {
  title: "Edit customer",
};

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const action = updateCustomerAction.bind(null, customer.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/app/customers/${customer.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customer
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit {customer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            initial={{
              name: customer.name,
              phone: customer.phone ?? "",
              email: customer.email ?? "",
              address: customer.address ?? "",
              notes: customer.notes ?? "",
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
