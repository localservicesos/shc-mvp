"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
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
import { isRedirectError } from "@/lib/utils/redirect";

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];
type ButtonSize = React.ComponentProps<typeof Button>["size"];

type ConfirmDeleteButtonProps = {
  /**
   * The already-bound delete action. If it throws, the message is shown as an
   * error toast; if it redirects (NEXT_REDIRECT), navigation is allowed through.
   */
  action: () => Promise<void> | void;
  /** Accessible label + tooltip on the trash trigger. */
  label: string;
  /** Dialog heading, e.g. "Delete this job?". */
  title: string;
  /** Dialog body text. */
  description?: string;
  /** Confirm button text. Defaults to "Delete". */
  confirmLabel?: string;
  /** Trigger button variant. Defaults to "ghost". */
  variant?: ButtonVariant;
  /** Trigger button size. Defaults to "icon". */
  size?: ButtonSize;
  /** Extra classes for the trigger button. */
  className?: string;
  /** Classes for the trash icon. Defaults to "h-4 w-4". */
  iconClassName?: string;
};

/**
 * A trash/delete button that asks for confirmation in a dialog before running
 * the action. Used for every destructive delete in the app so nothing is
 * removed by a single accidental click.
 */
export function ConfirmDeleteButton({
  action,
  label,
  title,
  description = "This can't be undone.",
  confirmLabel = "Delete",
  variant = "ghost",
  size = "icon",
  className,
  iconClassName = "h-4 w-4",
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await action();
        setOpen(false);
      } catch (err) {
        // A redirect on success isn't an error — let Next navigate.
        if (isRedirectError(err)) throw err;
        toast.error(
          err instanceof Error ? err.message : "Couldn't delete. Try again.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          aria-label={label}
          title={label}
          className={className}
        >
          <Trash2 className={iconClassName} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
