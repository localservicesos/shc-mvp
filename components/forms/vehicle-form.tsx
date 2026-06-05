"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type VehicleFormValues = {
  make: string;
  model: string;
  year: string;
  color: string;
  plate: string;
  notes: string;
};

const EMPTY: VehicleFormValues = {
  make: "",
  model: "",
  year: "",
  color: "",
  plate: "",
  notes: "",
};

type VehicleFormProps = {
  initial?: Partial<VehicleFormValues>;
  submitLabel: string;
  action: (formData: FormData) => Promise<void> | void;
  cancelHref?: string;
};

export function VehicleForm({
  initial,
  submitLabel,
  action,
  cancelHref,
}: VehicleFormProps) {
  const [values, setValues] = useState<VehicleFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof VehicleFormValues>(
    key: K,
    value: VehicleFormValues[K],
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="make">Make</Label>
          <Input
            id="make"
            name="make"
            value={values.make}
            onChange={(e) => setField("make", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            name="model"
            value={values.model}
            onChange={(e) => setField("model", e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            name="year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            value={values.year}
            onChange={(e) => setField("year", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            name="color"
            value={values.color}
            onChange={(e) => setField("color", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="plate">Plate</Label>
          <Input
            id="plate"
            name="plate"
            value={values.plate}
            onChange={(e) => setField("plate", e.target.value.toUpperCase())}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
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
