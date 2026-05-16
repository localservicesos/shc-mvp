import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";

export type Vehicle = {
  id: string;
  business_id: string;
  customer_id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  plate: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleInput = {
  customer_id: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  plate?: string | null;
  notes?: string | null;
};

export async function listVehiclesForCustomer(
  customerId: string,
): Promise<Vehicle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listAllVehicles(): Promise<Vehicle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      business_id: business.id,
      customer_id: input.customer_id,
      make: input.make ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      color: input.color ?? null,
      plate: input.plate ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateVehicle(
  id: string,
  input: Omit<VehicleInput, "customer_id">,
): Promise<Vehicle> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .update({
      make: input.make ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      color: input.color ?? null,
      plate: input.plate ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

export function describeVehicle(v: Vehicle): string {
  const parts = [v.year?.toString(), v.make, v.model].filter(Boolean);
  return parts.join(" ") || "Unnamed vehicle";
}
