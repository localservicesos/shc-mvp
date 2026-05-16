"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInput,
} from "@/lib/db/customers";

function parseCustomerForm(formData: FormData): CustomerInput {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const fields = ["phone", "email", "address", "notes"] as const;
  const optional: Partial<CustomerInput> = {};
  for (const key of fields) {
    const value = String(formData.get(key) ?? "").trim();
    optional[key] = value ? value : null;
  }
  return { name, ...optional };
}

export async function createCustomerAction(formData: FormData) {
  const input = parseCustomerForm(formData);
  const customer = await createCustomer(input);
  revalidatePath("/app/customers");
  redirect(`/app/customers/${customer.id}`);
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const input = parseCustomerForm(formData);
  await updateCustomer(id, input);
  revalidatePath("/app/customers");
  revalidatePath(`/app/customers/${id}`);
  redirect(`/app/customers/${id}`);
}

export async function deleteCustomerAction(id: string) {
  await deleteCustomer(id);
  revalidatePath("/app/customers");
  redirect("/app/customers");
}
