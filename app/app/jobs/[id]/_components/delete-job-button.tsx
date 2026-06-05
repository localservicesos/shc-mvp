"use client";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteJobAction } from "../../actions";
import type { JobStatus } from "@/types/jobs";

export function DeleteJobButton({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  if (status === "completed") return null;

  return (
    <ConfirmDeleteButton
      action={async () => {
        const res = await deleteJobAction(jobId, {});
        if (res?.error) throw new Error(res.error);
      }}
      label="Delete job"
      title="Delete this job?"
      variant="destructive"
    />
  );
}
