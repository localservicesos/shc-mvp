"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCustomerAction } from "../../actions";

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteCustomerAction.bind(null, customerId),
    {},
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
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
  );
}
