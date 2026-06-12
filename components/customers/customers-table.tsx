import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer } from "@/lib/db/customers";

// Server component on purpose: rows render to HTML once instead of being
// shipped a second time as serialized client-component props.
export function CustomersTable({ customers }: { customers: Customer[] }) {
  const rows = customers;

  return (
    <div className="rounded-md border">
      {/* Slightly smaller text on tablet, where the narrow sidebar still
          leaves limited room for four text-heavy columns. */}
      <Table className="md:max-lg:text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No customers to show.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-normal font-medium">
                  <Link
                    href={`/app/customers/${c.id}`}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {c.email ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {c.address ?? "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
