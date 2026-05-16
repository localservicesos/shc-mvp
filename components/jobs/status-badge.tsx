import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/db/jobs";

const STYLES: Record<JobStatus, string> = {
  booked: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-rose-100 text-rose-700",
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
