import { createClient } from "@/lib/supabase/server";

export type CurrentBusiness = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  role: "owner" | "staff";
  abn: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
};

/**
 * Returns the business the authenticated user belongs to.
 *
 * MVP assumes a single business per user. When multi-business support
 * lands, this becomes a "default business" lookup driven by a cookie or
 * a `business_members.is_default` flag.
 */
export async function getCurrentBusiness(): Promise<CurrentBusiness | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_members")
    .select(
      "role, businesses ( id, name, slug, timezone, currency, abn, email, phone, address, logo_url )",
    )
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.businesses) {
    return null;
  }

  // Supabase typing models a to-one relation as an array in some setups.
  const business = Array.isArray(data.businesses)
    ? data.businesses[0]
    : data.businesses;
  if (!business) return null;

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    timezone: business.timezone,
    currency: business.currency,
    role: data.role,
    abn: business.abn ?? null,
    email: business.email ?? null,
    phone: business.phone ?? null,
    address: business.address ?? null,
    logo_url: business.logo_url ?? null,
  };
}
