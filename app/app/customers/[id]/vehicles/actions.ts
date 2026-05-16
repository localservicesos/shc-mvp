"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createVehicle,
  deleteVehicle,
  updateVehicle,
  type VehicleInput,
} from "@/lib/db/vehicles";

function optionalString(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "").trim();
  return v ? v : null;
}

function optionalYear(value: FormDataEntryValue | null): number | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const parsed = Number.parseInt(v, 10);
  if (Number.isNaN(parsed)) throw new Error("Year must be a number.");
  return parsed;
}

function parseVehicleForm(
  customerId: string,
  formData: FormData,
): VehicleInput {
  return {
    customer_id: customerId,
    make: optionalString(formData.get("make")),
    model: optionalString(formData.get("model")),
    year: optionalYear(formData.get("year")),
    color: optionalString(formData.get("color")),
    plate: optionalString(formData.get("plate")),
    notes: optionalString(formData.get("notes")),
  };
}

export async function createVehicleAction(
  customerId: string,
  formData: FormData,
) {
  const input = parseVehicleForm(customerId, formData);
  await createVehicle(input);
  revalidatePath(`/app/customers/${customerId}`);
  redirect(`/app/customers/${customerId}`);
}

export async function updateVehicleAction(
  customerId: string,
  vehicleId: string,
  formData: FormData,
) {
  const { customer_id: _customer_id, ...input } = parseVehicleForm(
    customerId,
    formData,
  );
  void _customer_id;
  await updateVehicle(vehicleId, input);
  revalidatePath(`/app/customers/${customerId}`);
  redirect(`/app/customers/${customerId}`);
}

export async function deleteVehicleAction(
  customerId: string,
  vehicleId: string,
) {
  await deleteVehicle(vehicleId);
  revalidatePath(`/app/customers/${customerId}`);
  redirect(`/app/customers/${customerId}`);
}
