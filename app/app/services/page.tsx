import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilterProvider } from "@/components/search/search-filter-context";
import { ServicesTable } from "@/components/services/services-table";
import { listServices } from "@/lib/db/services";
import { buildSearchIndex } from "@/lib/db/search";

export const metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  const [services, index] = await Promise.all([
    listServices(),
    buildSearchIndex("services"),
  ]);

  return (
    <SearchFilterProvider>
      <div className="space-y-6">
        {/* Mobile: row1 = title + button, row2 = full-width subtitle, row3 =
            search. lg: 3 columns with title/subtitle stacked in column 1. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)_minmax(0,1fr)] lg:gap-3">
          <h1 className="text-2xl font-semibold">Services</h1>
          <Button
            asChild
            className="shrink-0 justify-self-end lg:col-start-3 lg:row-span-2 lg:self-center"
          >
            <Link href="/app/services/new">
              <Plus className="mr-2 h-4 w-4" />
              New service
            </Link>
          </Button>
          <p className="col-span-2 text-sm text-muted-foreground lg:col-span-1 lg:col-start-1 lg:row-start-2">
            What you offer. Active services show up when creating jobs.
          </p>
          <div className="col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <SearchBar
              scope="services"
              mode="filter"
              placeholder="Search by name…"
            />
          </div>
        </div>

        {services.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            <p>No services yet.</p>
            <p>
              <Link
                href="/app/services/new"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Add your first one
              </Link>
              .
            </p>
          </div>
        ) : (
          <ServicesTable services={services} index={index} />
        )}
      </div>
    </SearchFilterProvider>
  );
}
