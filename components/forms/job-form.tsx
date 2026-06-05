"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { isRedirectError } from "@/lib/utils/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  jobTotal,
  type JobStatus,
} from "@/types/jobs";
import { formatMoney } from "@/lib/utils/format";

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
  discount: string;
  extra: string;
  adjustment_note: string;
  notes: string;
  cancellation_reason: string;
};

const EMPTY: JobFormValues = {
  customer_id: "",
  vehicle_id: "",
  service_id: "",
  scheduled_start: "",
  scheduled_end: "",
  status: "booked",
  price: "",
  discount: "",
  extra: "",
  adjustment_note: "",
  notes: "",
  cancellation_reason: "",
};

type JobFormProps = {
  initial?: Partial<JobFormValues>;
  customers: JobFormCustomer[];
  vehicles: JobFormVehicle[];
  services: JobFormService[];
  submitLabel: string;
  /** Green toast shown on success (right before the action redirects away). */
  successMessage?: string;
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
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&_option]:bg-popover [&_option]:text-popover-foreground";

export function JobForm({
  initial,
  customers,
  vehicles,
  services,
  submitLabel,
  successMessage,
  action,
  cancelHref,
  showStatus = false,
  lockCustomer = false,
}: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [isPending, startTransition] = useTransition();

  const availableVehicles = useMemo(
    () =>
      values.customer_id
        ? vehicles.filter((v) => v.customer_id === values.customer_id)
        : [],
    [values.customer_id, vehicles],
  );

  // Live job total: price - discount + extra (clamped at 0). Mirrors the
  // server-side jobTotal() so the user sees exactly what will be invoiced.
  const total = useMemo(
    () =>
      jobTotal({
        price: values.price === "" ? null : Number.parseFloat(values.price),
        discount:
          values.discount === "" ? 0 : Number.parseFloat(values.discount),
        extra: values.extra === "" ? 0 : Number.parseFloat(values.extra),
      }),
    [values.price, values.discount, values.extra],
  );

  const hasAdjustment = values.discount !== "" || values.extra !== "";

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
      // Set the price to the selected service's base price; clearing the
      // service leaves the current price untouched. The user can still edit
      // the price afterwards.
      price: service ? service.base_price.toString() : prev.price,
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (values.status === "cancelled" && !values.cancellation_reason.trim()) {
      toast.error("Add a reason to cancel.");
      return;
    }

    if (!values.scheduled_start || !values.scheduled_end) {
      toast.error("Pick a start and end time.");
      return;
    }

    // datetime-local strings ("YYYY-MM-DDTHH:MM") compare correctly as text.
    if (values.scheduled_end <= values.scheduled_start) {
      toast.error("End date must be after start date.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (err) {
        // A Server Action that redirects on success throws NEXT_REDIRECT —
        // that's not an error. Show the success toast and let Next navigate.
        if (isRedirectError(err)) {
          if (successMessage) toast.success(successMessage, { duration: 2000 });
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
          <Label htmlFor="scheduled_start">
            Scheduled start <span className="text-destructive">*</span>
          </Label>
          <Input
            id="scheduled_start"
            name="scheduled_start"
            type="datetime-local"
            required
            value={values.scheduled_start}
            onChange={(e) => setField("scheduled_start", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled_end">
            Scheduled end <span className="text-destructive">*</span>
          </Label>
          <Input
            id="scheduled_end"
            name="scheduled_end"
            type="datetime-local"
            required
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
              onChange={(e) => setField("status", e.target.value as JobStatus)}
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

      <div className="rounded-md border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="discount">Discount (AUD)</Label>
            <Input
              id="discount"
              name="discount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={values.discount}
              onChange={(e) => setField("discount", e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="extra">Extra charge (AUD)</Label>
            <Input
              id="extra"
              name="extra"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={values.extra}
              onChange={(e) => setField("extra", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        {hasAdjustment ? (
          <div className="mt-4 flex flex-col gap-2">
            <Label htmlFor="adjustment_note">Reason for adjustment</Label>
            <Textarea
              id="adjustment_note"
              name="adjustment_note"
              rows={2}
              placeholder="e.g. Repeat-customer discount, extra-dirty vehicle…"
              value={values.adjustment_note}
              onChange={(e) => setField("adjustment_note", e.target.value)}
              disabled={isPending}
            />
          </div>
        ) : (
          <input type="hidden" name="adjustment_note" value="" />
        )}

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Job total</span>
          <span className="text-base font-semibold tabular-nums">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      {values.status === "cancelled" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancellation_reason">
            Cancellation reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancellation_reason"
            name="cancellation_reason"
            rows={3}
            placeholder="e.g. Customer rescheduled, vehicle not available…"
            value={values.cancellation_reason}
            onChange={(e) => setField("cancellation_reason", e.target.value)}
            disabled={isPending}
            className="border-rose-300 focus-visible:ring-rose-400"
          />
        </div>
      ) : (
        <input type="hidden" name="cancellation_reason" value="" />
      )}

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
