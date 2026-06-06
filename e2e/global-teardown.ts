/**
 * Global teardown — runs once after the whole suite.
 *
 * Deletes the test business (ON DELETE CASCADE removes every customer,
 * vehicle, service, job, photo and invoice that the tests created) and then
 * the test auth user. Nothing is left behind in the remote database.
 *
 * Controlled by E2E_KEEP_DATA=1 to skip cleanup when debugging.
 */
import { readFileSync, existsSync } from "node:fs";
import { admin, TENANT_FILE } from "./lib/test-tenant";

export default async function globalTeardown() {
  if (process.env.E2E_KEEP_DATA === "1") {
    console.log("\n[e2e] E2E_KEEP_DATA=1 set — skipping cleanup.\n");
    return;
  }
  if (!existsSync(TENANT_FILE)) return;

  const { userId, businessId } = JSON.parse(readFileSync(TENANT_FILE, "utf-8"));
  const sb = admin();

  console.log("\n[e2e] cleaning up test tenant…");

  // Deleting the business cascades to all operational rows.
  const { error: bizErr } = await sb
    .from("businesses")
    .delete()
    .eq("id", businessId);
  if (bizErr) console.warn(`  ! business delete: ${bizErr.message}`);
  else console.log("  ✓ deleted test business (cascade)");

  // Remove the auth user too.
  const { error: userErr } = await sb.auth.admin.deleteUser(userId);
  if (userErr) console.warn(`  ! user delete: ${userErr.message}`);
  else console.log("  ✓ deleted test user");

  console.log("[e2e] cleanup done.\n");
}
