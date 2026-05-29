import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-48" />
      </div>
      <TableSkeleton cols={5} />
    </div>
  );
}
