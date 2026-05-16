import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listServices } from "@/lib/db/services";
import { formatMoney } from "@/lib/utils/format";
import { deleteServiceAction } from "./actions";

export const metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  const services = await listServices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">
            What you offer. Active services show up when creating jobs.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/services/new">
            <Plus className="mr-2 h-4 w-4" />
            New service
          </Link>
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>No services yet.</p>
          <p>
            <Link
              href="/app/services/new"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Add your first one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">
                  Description
                </TableHead>
                <TableHead className="text-right">Base price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                    {s.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(s.base_price)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        s.active
                          ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          : "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    <Button asChild size="icon" variant="ghost">
                      <Link
                        href={`/app/services/${s.id}/edit`}
                        aria-label="Edit service"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <form action={deleteServiceAction.bind(null, s.id)}>
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        aria-label="Delete service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
