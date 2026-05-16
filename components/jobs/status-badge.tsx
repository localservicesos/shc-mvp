import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/db/jobs";

const STYLES: Record<JobStatus, string> = {
  booked:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  in_progress:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  ready:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  completed: "bg-muted text-muted-foreground",
  cancelled:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
