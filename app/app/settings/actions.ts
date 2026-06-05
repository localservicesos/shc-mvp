"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  updateBusinessSettings,
  type BusinessSettingsInput,
} from "@/lib/db/business";
import { toTitleCase } from "@/lib/utils/format";

function parseSettingsForm(formData: FormData): BusinessSettingsInput {
  const name = toTitleCase(String(formData.get("name") ?? "").trim());
  if (!name) throw new Error("Business name is required.");

  const fields = ["abn", "email", "phone", "address"] as const;
  const optional: Partial<BusinessSettingsInput> = {};
  for (const key of fields) {
    const value = String(formData.get(key) ?? "").trim();
    optional[key] = value ? value : null;
  }
  return { name, ...optional };
}

export async function updateSettingsAction(formData: FormData) {
  const input = parseSettingsForm(formData);
  await updateBusinessSettings(input);
  // Revalidate the whole app subtree so the sidebar business name refreshes.
  revalidatePath("/app", "layout");
  redirect("/app/settings?saved=1");
}
