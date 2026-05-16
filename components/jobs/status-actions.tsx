import { Button } from "@/components/ui/button";
import {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  type JobStatus,
} from "@/lib/db/jobs";
import { updateJobStatusAction } from "@/app/app/jobs/actions";

const NEXT_STEP: Partial<Record<JobStatus, JobStatus>> = {
  booked: "in_progress",
  in_progress: "ready",
  ready: "completed",
};

export function JobStatusActions({
  id,
  status,
}: {
  id: string;
  status: JobStatus;
}) {
  const next = NEXT_STEP[status];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next ? (
        <form action={updateJobStatusAction.bind(null, id, next)}>
          <Button type="submit" size="sm">
            Mark as {JOB_STATUS_LABELS[next].toLowerCase()}
          </Button>
        </form>
      ) : null}

      {status !== "cancelled" && status !== "completed" ? (
        <form action={updateJobStatusAction.bind(null, id, "cancelled")}>
          <Button type="submit" size="sm" variant="outline">
            Cancel job
          </Button>
        </form>
      ) : null}

      {status === "cancelled" || status === "completed" ? (
        <form action={updateJobStatusAction.bind(null, id, "booked")}>
          <Button type="submit" size="sm" variant="outline">
            Reopen as booked
          </Button>
        </form>
      ) : null}

      {/* Catch-all: jump straight to any status. Useful for fixing mistakes. */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          More…
        </summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {JOB_STATUSES.filter((s) => s !== status).map((s) => (
            <form
              key={s}
              action={updateJobStatusAction.bind(null, id, s)}
            >
              <Button type="submit" size="sm" variant="ghost">
                Set to {JOB_STATUS_LABELS[s].toLowerCase()}
              </Button>
            </form>
          ))}
        </div>
      </details>
    </div>
  );
}
