import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  base_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceInput = {
  name: string;
  description?: string | null;
  base_price: number;
  active: boolean;
};

export async function listServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function listActiveServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function getService(id: string): Promise<Service | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Service | null;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      business_id: business.id,
      name: input.name,
      description: input.description ?? null,
      base_price: input.base_price,
      active: input.active,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Service;
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<Service> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update({
      name: input.name,
      description: input.description ?? null,
      base_price: input.base_price,
      active: input.active,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Service;
}

export async function deleteService(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}
