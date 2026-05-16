import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { listInvoices } from "@/lib/db/invoices";
import { formatMoney } from "@/lib/utils/format";

export const metadata = {
  title: "Invoices",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function InvoicesPage() {
  const invoices = await listInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Invoices are generated from jobs. Open a job and click
          &quot;Generate invoice&quot; to create one.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>No invoices yet.</p>
          <p>
            Generate one from any job on the{" "}
            <Link
              href="/app/jobs"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Jobs
            </Link>{" "}
            page.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/app/invoices/${inv.id}`}
                      className="hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.job?.customer?.name ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatDate(inv.created_at)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(inv.amount)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
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
