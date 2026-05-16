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
import { getCustomer } from "@/lib/db/customers";
import { deleteCustomerAction } from "../actions";

export const metadata = {
  title: "Customer",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
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

      <div className="flex items-start justify-between gap-4">
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
          <form action={deleteCustomerAction.bind(null, customer.id)}>
            <Button
              type="submit"
              variant="destructive"
              size="icon"
              aria-label="Delete customer"
              title="Delete customer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
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
        <CardHeader>
          <CardTitle className="text-base">Vehicles</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Coming next — vehicles linked to this customer will appear here.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job history</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Coming next — past and upcoming jobs for this customer.
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
