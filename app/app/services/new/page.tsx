import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceForm } from "@/components/forms/service-form";
import { createServiceAction } from "../actions";

export const metadata = {
  title: "New service",
};

export default function NewServicePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/services"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to services
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New service</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            submitLabel="Create service"
            action={createServiceAction}
            cancelHref="/app/services"
          />
        </CardContent>
      </Card>
    </div>
  );
}
