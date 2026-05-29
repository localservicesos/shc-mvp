import { Button } from "@/components/ui/button";
import { type JobStatus } from "@/lib/db/jobs";
import { updateJobStatusAction } from "@/app/app/jobs/actions";
import { CancelJobDialog } from "./cancel-job-dialog";

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
          <CancelJobDialog jobId={id} />
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
