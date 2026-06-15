"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extendJobAction } from "@/app/app/jobs/actions";

/**
 * "New end time" control shown on a job that ran past its scheduled window
 * (needs_attention). The owner picks a new end in the date picker and saving it
 * via extendJobAction lands the job back in progress.
 */
export function ExtendTimeForm({
  jobId,
  currentEnd,
}: {
  jobId: string;
  /** Current scheduled end as a datetime-local value ("YYYY-MM-DDTHH:MM"). */
  currentEnd: string;
}) {
  const [value, setValue] = useState(currentEnd);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!value) {
      toast.error("Pick a new end time.");
      return;
    }
    startTransition(async () => {
      try {
        await extendJobAction(jobId, value);
        toast.success("End time updated.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't update the time.",
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isPending}
        aria-label="New end time"
        className="w-auto"
      />
      <Button type="button" size="sm" onClick={save} disabled={isPending}>
        {isPending ? "Saving…" : "Update end time"}
      </Button>
    </div>
  );
}
