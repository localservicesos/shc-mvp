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
