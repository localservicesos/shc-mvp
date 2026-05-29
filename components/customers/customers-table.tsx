"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFilteredIds } from "@/components/search/search-filter-context";
import type { Customer } from "@/lib/db/customers";
import type { SearchIndexItem } from "@/types/search";

export function CustomersTable({
  customers,
  index,
}: {
  customers: Customer[];
  index: SearchIndexItem[];
}) {
  const ids = useFilteredIds(index);
  const rows = ids ? customers.filter((c) => ids.has(c.id)) : customers;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No customers match your search.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/app/customers/${c.id}`}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">
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
