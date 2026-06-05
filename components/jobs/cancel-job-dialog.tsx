"use client";

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cancelJobAction } from "@/app/app/jobs/actions";

export function CancelJobDialog({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next);
      if (!next) setReason("");
    }
  }

  function handleConfirm() {
    if (!reason.trim()) {
      toast.error("Please enter a reason for cancelling.");
      textareaRef.current?.focus();
      return;
    }
    startTransition(async () => {
      try {
        await cancelJobAction(jobId, reason.trim());
        setOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to cancel the job.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Cancel job
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this job?</DialogTitle>
          <DialogDescription>
            This will mark the job as cancelled. Please tell us why so there is
            a record for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            ref={textareaRef}
            placeholder="e.g. Customer rescheduled, vehicle not available…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={isPending}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Go back
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
