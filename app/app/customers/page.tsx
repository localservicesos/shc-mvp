import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilterProvider } from "@/components/search/search-filter-context";
import { CustomersTable } from "@/components/customers/customers-table";
import { listCustomers } from "@/lib/db/customers";
import { buildSearchIndex } from "@/lib/db/search";

export const metadata = {
  title: "Customers",
};

export default async function CustomersPage() {
  const [customers, index] = await Promise.all([
    listCustomers(),
    buildSearchIndex("customers"),
  ]);

  return (
    <SearchFilterProvider>
      <div className="space-y-6">
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Customers</h1>
            <p className="text-sm text-muted-foreground">
              People you do work for. Vehicles and jobs hang off these.
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <div className="pointer-events-auto w-full max-w-sm">
              <SearchBar
                scope="customers"
                mode="filter"
                placeholder="Search by name, phone, email, address, or plate…"
              />
            </div>
          </div>
          <Button asChild>
            <Link href="/app/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              New customer
            </Link>
          </Button>
        </div>

        {customers.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            <p>No customers yet.</p>
            <p>
              <Link
                href="/app/customers/new"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Add the first one
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <CustomersTable customers={customers} index={index} />
        )}
      </div>
    </SearchFilterProvider>
  );
}
