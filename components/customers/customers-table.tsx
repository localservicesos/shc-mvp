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
                No customers match your search.
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
