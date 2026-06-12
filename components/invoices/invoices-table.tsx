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
import { formatMoney } from "@/lib/utils/format";
import type { InvoiceWithRelations } from "@/lib/db/invoices";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Server component on purpose: rows render to HTML once instead of being
// shipped a second time as serialized client-component props.
export function InvoicesTable({
  invoices,
}: {
  invoices: InvoiceWithRelations[];
}) {
  const rows = invoices;

  return (
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
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No invoices to show.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/app/invoices/${inv.id}`}
                    className="hover:underline"
                  >
                    {inv.invoice_number}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {inv.job?.customer?.name ?? "—"}
                </TableCell>
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
