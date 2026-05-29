import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-28 shrink-0" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="hidden h-5 w-40 sm:block" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-[480px] w-full rounded-md" />
    </div>
  );
}
