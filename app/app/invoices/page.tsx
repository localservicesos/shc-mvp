import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilterProvider } from "@/components/search/search-filter-context";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { INVOICES_PAGE_SIZE, listInvoicesPaged } from "@/lib/db/invoices";
import { buildSearchIndex } from "@/lib/db/search";

export const metadata = {
  title: "Invoices",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [{ rows: invoices, total }, index] = await Promise.all([
    listInvoicesPaged(page),
    buildSearchIndex("invoices"),
  ]);

  return (
    <SearchFilterProvider>
      <div className="space-y-6">
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              Invoices are generated from jobs. Open a job and click
              &quot;Generate invoice&quot; to create one.
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <div className="pointer-events-auto w-full max-w-sm">
              <SearchBar
                scope="invoices"
                mode="filter"
                placeholder="Search by invoice number or customer…"
              />
            </div>
          </div>
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
          <>
            <InvoicesTable invoices={invoices} index={index} />
            <PaginationControls
              page={page}
              pageSize={INVOICES_PAGE_SIZE}
              total={total}
              makeHref={(p) =>
                p > 1 ? `/app/invoices?page=${p}` : "/app/invoices"
              }
            />
          </>
        )}
      </div>
    </SearchFilterProvider>
  );
}
