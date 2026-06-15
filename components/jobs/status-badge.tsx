import { cn } from "@/lib/utils";
import {
  JOB_DISPLAY_STATUS_LABELS,
  type JobDisplayStatus,
} from "@/types/jobs";

const STYLES: Record<JobDisplayStatus, string> = {
  booked:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  in_progress:
    "bg-yellow-200 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-200",
  needs_attention:
    "bg-orange-200 text-orange-800 dark:bg-orange-600/30 dark:text-orange-200",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

export function JobStatusBadge({ status }: { status: JobDisplayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {JOB_DISPLAY_STATUS_LABELS[status]}
    </span>
  );
}
