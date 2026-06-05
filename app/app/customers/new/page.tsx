import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomerForm } from "@/components/forms/customer-form";
import { createCustomerAction } from "../actions";

export const metadata = {
  title: "New customer",
};

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/customers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            submitLabel="Create customer"
            successMessage="Customer created"
            action={createCustomerAction}
            cancelHref="/app/customers"
          />
        </CardContent>
      </Card>
    </div>
  );
}
