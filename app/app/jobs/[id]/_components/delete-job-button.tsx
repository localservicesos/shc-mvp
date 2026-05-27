"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteJobAction } from "../../actions";

export function DeleteJobButton({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteJobAction.bind(null, jobId),
    {},
  );

  return (
    <div className="flex flex-col items-end gap-1">
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
      {state?.error ? (
        <p className="max-w-xs text-right text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
