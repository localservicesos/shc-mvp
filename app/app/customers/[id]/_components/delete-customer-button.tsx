"use client";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteCustomerAction } from "../../actions";

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  return (
    <ConfirmDeleteButton
      action={async () => {
        const res = await deleteCustomerAction(customerId, {});
        if (res?.error) throw new Error(res.error);
      }}
      label="Delete customer"
      title="Delete this customer?"
      variant="destructive"
    />
  );
}
