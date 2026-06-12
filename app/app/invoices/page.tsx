import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilterProvider } from "@/components/search/search-filter-context";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { listInvoices } from "@/lib/db/invoices";
import { buildSearchIndex } from "@/lib/db/search";

export const metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const [invoices, index] = await Promise.all([
    listInvoices(),
    buildSearchIndex("invoices"),
  ]);

  return (
    <SearchFilterProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)_minmax(0,1fr)]">
          <div>
            <h1 className="text-2xl font-semibold">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              Invoices are generated from jobs. Open a job and click
              &quot;Generate invoice&quot; to create one.
            </p>
          </div>
          <div className="order-last w-full lg:order-none">
            <SearchBar
              scope="invoices"
              mode="filter"
              placeholder="Search by invoice number or customer…"
            />
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
          <InvoicesTable invoices={invoices} index={index} />
        )}
      </div>
    </SearchFilterProvider>
  );
}
