import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "@/components/forms/settings-form";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { updateSettingsAction } from "./actions";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const business = await getCurrentBusiness();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business details shown on invoices and across the app.
        </p>
      </div>
      {saved ? (
        <p
          className="rounded-md border border-green-600/30 bg-green-600/10 px-4 py-2 text-sm text-green-700 dark:text-green-400"
          role="status"
        >
          Settings saved.
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initial={{
              name: business?.name ?? "",
              abn: business?.abn ?? "",
              email: business?.email ?? "",
              phone: business?.phone ?? "",
              address: business?.address ?? "",
            }}
            action={updateSettingsAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
