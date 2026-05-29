import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading skeletons used by the route-level `loading.tsx` files.
 *
 * These render instantly when navigating to a dynamic route while the
 * Server Component fetches its data, so the click feels immediate instead
 * of waiting on a Supabase round-trip before anything appears.
 */

/** Title + subtitle on the left, optional primary-action button on the right. */
export function PageHeaderSkeleton({
  withButton = true,
}: {
  withButton?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 max-w-[60vw]" />
      </div>
      {withButton ? <Skeleton className="h-9 w-28 shrink-0" /> : null}
    </div>
  );
}

/** A bordered table shell with a header row and N body rows. */
export function TableSkeleton({
  rows = 6,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-4 border-b px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Header + table — the shape of every list page (customers, jobs, etc.). */
export function ListPageSkeleton({
  withButton = true,
  cols = 4,
}: {
  withButton?: boolean;
  cols?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withButton={withButton} />
      <TableSkeleton cols={cols} />
    </div>
  );
}

/** A single Card with a title bar and a few body lines. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full last:w-2/3" />
        ))}
      </CardContent>
    </Card>
  );
}

/** Back-link, header with actions, then a grid of cards — detail pages. */
export function DetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={2} />
      </div>
      <CardSkeleton lines={4} />
    </div>
  );
}
