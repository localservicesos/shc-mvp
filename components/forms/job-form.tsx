"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  type JobStatus,
} from "@/types/jobs";

export type JobFormCustomer = { id: string; name: string };
export type JobFormVehicle = {
  id: string;
  customer_id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
};
export type JobFormService = { id: string; name: string; base_price: number };

export type JobFormValues = {
  customer_id: string;
  vehicle_id: string;
  service_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: JobStatus;
  price: string;
  notes: string;
};

const EMPTY: JobFormValues = {
  customer_id: "",
  vehicle_id: "",
  service_id: "",
  scheduled_start: "",
  scheduled_end: "",
  status: "booked",
  price: "",
  notes: "",
};

type JobFormProps = {
  initial?: Partial<JobFormValues>;
  customers: JobFormCustomer[];
  vehicles: JobFormVehicle[];
  services: JobFormService[];
  submitLabel: string;
  action: (formData: FormData) => Promise<void> | void;
  cancelHref?: string;
  showStatus?: boolean;
  lockCustomer?: boolean;
};

function vehicleLabel(v: JobFormVehicle): string {
  const parts = [v.year?.toString(), v.make, v.model].filter(Boolean);
  const desc = parts.join(" ") || "Vehicle";
  return v.plate ? `${desc} (${v.plate})` : desc;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function JobForm({
  initial,
  customers,
  vehicles,
  services,
  submitLabel,
  action,
  cancelHref,
  showStatus = false,
  lockCustomer = false,
}: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableVehicles = useMemo(
    () =>
      values.customer_id
        ? vehicles.filter((v) => v.customer_id === values.customer_id)
        : [],
    [values.customer_id, vehicles],
  );

  function setField<K extends keyof JobFormValues>(
    key: K,
    value: JobFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onCustomerChange(customerId: string) {
    setValues((prev) => ({
      ...prev,
      customer_id: customerId,
      vehicle_id:
        prev.vehicle_id &&
        vehicles.some(
          (v) => v.id === prev.vehicle_id && v.customer_id === customerId,
        )
          ? prev.vehicle_id
          : "",
    }));
  }

  function onServiceChange(serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    setValues((prev) => ({
      ...prev,
      service_id: serviceId,
      // Auto-fill price from service unless the user has already typed one.
      price:
        prev.price === "" && service
          ? service.base_price.toString()
          : prev.price,
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer_id">Customer</Label>
        <select
          id="customer_id"
          name="customer_id"
          required
          className={cn(selectClass)}
          value={values.customer_id}
          onChange={(e) => onCustomerChange(e.target.value)}
          disabled={isPending || lockCustomer}
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {lockCustomer ? (
          <input type="hidden" name="customer_id" value={values.customer_id} />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="vehicle_id">Vehicle</Label>
          <select
            id="vehicle_id"
            name="vehicle_id"
            className={cn(selectClass)}
            value={values.vehicle_id}
            onChange={(e) => setField("vehicle_id", e.target.value)}
            disabled={isPending || !values.customer_id}
          >
            <option value="">
              {values.customer_id
                ? availableVehicles.length === 0
                  ? "No vehicles for this customer"
                  : "None"
                : "Select a customer first"}
            </option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="service_id">Service</Label>
          <select
            id="service_id"
            name="service_id"
            className={cn(selectClass)}
            value={values.service_id}
            onChange={(e) => onServiceChange(e.target.value)}
            disabled={isPending}
          >
            <option value="">None</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled_start">Scheduled start</Label>
          <Input
            id="scheduled_start"
            name="scheduled_start"
            type="datetime-local"
            value={values.scheduled_start}
            onChange={(e) => setField("scheduled_start", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled_end">Scheduled end</Label>
          <Input
            id="scheduled_end"
            name="scheduled_end"
            type="datetime-local"
            value={values.scheduled_end}
            onChange={(e) => setField("scheduled_end", e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Price (AUD)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={values.price}
            onChange={(e) => setField("price", e.target.value)}
            disabled={isPending}
          />
        </div>
        {showStatus ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className={cn(selectClass)}
              value={values.status}
              onChange={(e) =>
                setField("status", e.target.value as JobStatus)
              }
              disabled={isPending}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {JOB_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="status" value={values.status} />
        )}
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

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
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
