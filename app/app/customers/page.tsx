import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";
import { CustomersTable } from "@/components/customers/customers-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { loadSearchIndexAction } from "@/app/app/search-actions";
import { CUSTOMERS_PAGE_SIZE, listCustomersPaged } from "@/lib/db/customers";

export const metadata = {
  title: "Customers",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const { rows: customers, total } = await listCustomersPaged(page);

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)_minmax(0,1fr)]">
          <div>
            <h1 className="text-2xl font-semibold">Customers</h1>
            <p className="text-sm text-muted-foreground">
              People you do work for. Vehicles and jobs hang off these.
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 flex justify-center lg:static lg:pointer-events-auto">
            <div className="pointer-events-auto w-full max-w-sm lg:max-w-none">
              <SearchBar
                scope="customers"
                loadIndex={loadSearchIndexAction}
                placeholder="Search by name, phone, email, address, or plate…"
              />
            </div>
          </div>
          <Button asChild className="lg:justify-self-end">
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
          <>
            <CustomersTable customers={customers} />
            <PaginationControls
              page={page}
              pageSize={CUSTOMERS_PAGE_SIZE}
              total={total}
              makeHref={(p) =>
                p > 1 ? `/app/customers?page=${p}` : "/app/customers"
              }
            />
          </>
        )}
      </div>
  );
}
