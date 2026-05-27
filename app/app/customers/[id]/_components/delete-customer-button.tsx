"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCustomerAction } from "../../actions";

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteCustomerAction.bind(null, customerId),
    {},
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <Button
          type="submit"
          variant="destructive"
          size="icon"
          disabled={pending}
          aria-label="Delete customer"
          title="Delete customer"
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
