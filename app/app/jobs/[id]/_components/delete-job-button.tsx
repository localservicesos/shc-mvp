"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteJobAction } from "../../actions";
import type { JobStatus } from "@/types/jobs";

export function DeleteJobButton({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const [state, formAction, pending] = useActionState(
    deleteJobAction.bind(null, jobId),
    {},
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (status === "completed") return null;

  return (
    <form action={formAction}>
      <Button
        type="submit"
        size="icon"
        variant="destructive"
        aria-label="Delete job"
        title="Delete job"
        disabled={pending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
