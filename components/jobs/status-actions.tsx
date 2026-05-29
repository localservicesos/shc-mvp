import { Button } from "@/components/ui/button";
import { type JobStatus } from "@/lib/db/jobs";
import { updateJobStatusAction } from "@/app/app/jobs/actions";

export function JobStatusActions({
  id,
  status,
}: {
  id: string;
  status: JobStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "booked" ? (
        <>
          <form action={updateJobStatusAction.bind(null, id, "completed")}>
            <Button type="submit" size="sm">
              Mark as completed
            </Button>
          </form>
          <form action={updateJobStatusAction.bind(null, id, "cancelled")}>
            <Button type="submit" size="sm" variant="outline">
              Cancel job
            </Button>
          </form>
        </>
      ) : (
        <form action={updateJobStatusAction.bind(null, id, "booked")}>
          <Button type="submit" size="sm" variant="outline">
            Reopen as booked
          </Button>
        </form>
      )}
    </div>
  );
}
