import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { toTitleCase } from "@/lib/utils/format";

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

/**
 * Capitalize display fields (name, address) so historical records saved
 * before normalization still render in Title Case everywhere.
 */
function normalizeCustomer<T extends { name: string; address?: string | null }>(
  customer: T,
): T {
  return {
    ...customer,
    name: toTitleCase(customer.name),
    address: customer.address ? toTitleCase(customer.address) : customer.address,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(normalizeCustomer);
}

export type CustomerOption = { id: string; name: string };

/**
 * id + name only — for form pickers. Skips notes/address/timestamps the
 * picker never shows, which matters once there are hundreds of customers.
 */
export async function listCustomerOptions(): Promise<CustomerOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, name: toTitleCase(c.name) }));
}

export const CUSTOMERS_PAGE_SIZE = 50;

/**
 * Page through customers instead of fetching the whole table. `total` is the
 * full row count so the UI can render page controls. The unpaged
 * `listCustomers` stays for pickers (e.g. the job form) that need every name.
 */
export async function listCustomersPaged(
  page = 1,
  pageSize = CUSTOMERS_PAGE_SIZE,
): Promise<{ rows: Customer[]; total: number }> {
  const first = (Math.max(1, page) - 1) * pageSize;
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(first, first + pageSize - 1);

  if (error) throw error;
  return { rows: (data ?? []).map(normalizeCustomer), total: count ?? 0 };
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeCustomer(data) : null;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: business.id,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<Customer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  // 23503 = foreign_key_violation — customer has job history and cannot be
  // deleted. Surface a friendly message instead of a raw Postgres error.
  if (error?.code === "23503") {
    throw new Error("Delete this customer's jobs first.");
  }

  if (error) throw error;
}
