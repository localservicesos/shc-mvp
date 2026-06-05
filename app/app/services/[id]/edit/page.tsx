import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceForm } from "@/components/forms/service-form";
import { getService } from "@/lib/db/services";
import { updateServiceAction } from "../../actions";

export const metadata = {
  title: "Edit service",
};

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();

  const action = updateServiceAction.bind(null, service.id);

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
          <CardTitle>Edit {service.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            initial={{
              name: service.name,
              description: service.description ?? "",
              base_price: service.base_price.toString(),
              active: service.active,
            }}
            submitLabel="Save changes"
            action={action}
            cancelHref="/app/services"
          />
        </CardContent>
      </Card>
    </div>
  );
}
