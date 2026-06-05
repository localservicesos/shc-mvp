"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ServiceFormValues = {
  name: string;
  description: string;
  base_price: string;
  active: boolean;
};

const EMPTY: ServiceFormValues = {
  name: "",
  description: "",
  base_price: "",
  active: true,
};

type ServiceFormProps = {
  initial?: Partial<ServiceFormValues>;
  submitLabel: string;
  action: (formData: FormData) => Promise<void> | void;
  cancelHref?: string;
};

export function ServiceForm({
  initial,
  submitLabel,
  action,
  cancelHref,
}: ServiceFormProps) {
  const [values, setValues] = useState<ServiceFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="base_price">Base price (AUD)</Label>
        <Input
          id="base_price"
          name="base_price"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          value={values.base_price}
          onChange={(e) => setField("base_price", e.target.value)}
          disabled={isPending}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          checked={values.active}
          onChange={(e) => setField("active", e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-input accent-foreground"
        />
        Active — shown when creating jobs
      </label>
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
