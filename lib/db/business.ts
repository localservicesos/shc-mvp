import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { toTitleCase } from "@/lib/utils/format";

export type BusinessSettingsInput = {
  name: string;
  abn?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

/**
 * Updates the contact/identity fields of the current business.
 *
 * Scoped to the authenticated user's business via getCurrentBusiness, so the
 * caller never passes an id — there is exactly one business per user in the MVP.
 */
export async function updateBusinessSettings(
  input: BusinessSettingsInput,
): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: toTitleCase(input.name),
      abn: input.abn ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ? toTitleCase(input.address) : null,
    })
    .eq("id", business.id);

  if (error) throw error;
}
