"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { isRedirectError } from "@/lib/utils/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CustomerFormValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const EMPTY: CustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

type CustomerFormProps = {
  initial?: Partial<CustomerFormValues>;
  submitLabel: string;
  /** Green toast shown on success (right before the action redirects away). */
  successMessage?: string;
  action: (formData: FormData) => Promise<void> | void;
  cancelHref?: string;
};

export function CustomerForm({
  initial,
  submitLabel,
  successMessage,
  action,
  cancelHref,
}: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (err) {
        if (isRedirectError(err)) {
          if (successMessage) toast.success(successMessage);
          throw err;
        }
        toast.error(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          value={values.address}
          onChange={(e) => setField("address", e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          value={values.notes}
          onChange={(e) => setField("notes", e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        {cancelHref ? (
          <Button type="button" variant="ghost" asChild disabled={isPending}>
            <a href={cancelHref}>Cancel</a>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
