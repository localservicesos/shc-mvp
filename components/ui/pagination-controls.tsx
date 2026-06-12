import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Prev/Next pagination for the list pages. Server component — navigation is
 * plain links so each page is a fresh server render of just that slice.
 * Renders nothing when everything fits on one page.
 */
export function PaginationControls({
  page,
  pageSize,
  total,
  makeHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Builds the href for a given page, preserving the page's other filters. */
  makeHref: (page: number) => string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Showing {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page + 1)}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
