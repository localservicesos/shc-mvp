"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFilteredIds } from "@/components/search/search-filter-context";
import { deleteServiceAction } from "@/app/app/services/actions";
import { formatMoney } from "@/lib/utils/format";
import type { Service } from "@/lib/db/services";
import type { SearchIndexItem } from "@/types/search";

export function ServicesTable({
  services,
  index,
}: {
  services: Service[];
  index: SearchIndexItem[];
}) {
  const ids = useFilteredIds(index);
  const rows = ids ? services.filter((s) => ids.has(s.id)) : services;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden lg:table-cell">Description</TableHead>
            <TableHead className="text-right">Base price</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No services match your search.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-normal font-medium">
                  {s.name}
                  {!s.active ? (
                    <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                      Inactive
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="hidden max-w-md truncate text-muted-foreground lg:table-cell">
                  {s.description ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(s.base_price)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span
                    className={
                      s.active
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
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
                  <ConfirmDeleteButton
                    action={deleteServiceAction.bind(null, s.id)}
                    label="Delete service"
                    title="Delete this service?"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
