"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createService,
  deleteService,
  updateService,
  type ServiceInput,
} from "@/lib/db/services";

function parseServiceForm(formData: FormData): ServiceInput {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Enter a name.");

  const description = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("base_price") ?? "").trim();
  const base_price = priceRaw === "" ? 0 : Number.parseFloat(priceRaw);
  if (Number.isNaN(base_price) || base_price < 0) {
    throw new Error("Enter a valid price.");
  }
  const active = formData.get("active") === "on";

  return {
    name,
    description: description ? description : null,
    base_price,
    active,
  };
}

export async function createServiceAction(formData: FormData) {
  const input = parseServiceForm(formData);
  await createService(input);
  revalidatePath("/app/services");
  redirect("/app/services");
}

export async function updateServiceAction(id: string, formData: FormData) {
  const input = parseServiceForm(formData);
  await updateService(id, input);
  revalidatePath("/app/services");
  redirect("/app/services");
}

export async function deleteServiceAction(id: string) {
  await deleteService(id);
  revalidatePath("/app/services");
  redirect("/app/services");
}
