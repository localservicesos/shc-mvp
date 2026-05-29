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
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Services</h1>
            <p className="text-sm text-muted-foreground">
              What you offer. Active services show up when creating jobs.
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <div className="pointer-events-auto w-full max-w-sm">
              <SearchBar
                scope="services"
                mode="filter"
                placeholder="Search by name…"
              />
            </div>
          </div>
          <Button asChild>
            <Link href="/app/services/new">
              <Plus className="mr-2 h-4 w-4" />
              New service
            </Link>
          </Button>
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
