/**
 * Global setup — runs once before the whole suite.
 *
 *  1. Provision an isolated test tenant (auth user + business + membership)
 *     using the service-role key. Idempotent: reuses them if they exist.
 *  2. Log into the real app in a browser and save the session to
 *     e2e/.auth/state.json so every test starts authenticated.
 */
import { chromium, type FullConfig } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  admin,
  findTestUser,
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_BUSINESS_NAME,
  TENANT_FILE,
} from "./lib/test-tenant";

async function provisionTenant() {
  const sb = admin();

  // 1. test auth user (confirmed, so no email step blocks login)
  let user = await findTestUser(sb);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`  ✓ created test user ${TEST_EMAIL}`);
  } else {
    // ensure password matches what the suite will use
    await sb.auth.admin.updateUserById(user.id, { password: TEST_PASSWORD });
    console.log(`  ✓ reusing test user ${TEST_EMAIL}`);
  }

  // 2. test business (unique slug per user so reruns are stable)
  const slug = `e2e-${user.id.slice(0, 8)}`;
  let businessId: string;
  const { data: existing } = await sb
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    businessId = existing.id;
    console.log(`  ✓ reusing test business ${slug}`);
  } else {
    const { data: biz, error: bizErr } = await sb
      .from("businesses")
      .insert({ name: TEST_BUSINESS_NAME, slug })
      .select("id")
      .single();
    if (bizErr) throw bizErr;
    businessId = biz.id;
    console.log(`  ✓ created test business ${slug}`);
  }

  // 3. membership linking user → business (owner)
  const { error: memErr } = await sb
    .from("business_members")
    .upsert(
      { user_id: user.id, business_id: businessId, role: "owner" },
      { onConflict: "user_id,business_id" },
    );
  if (memErr) throw memErr;

  // record for teardown
  mkdirSync(dirname(TENANT_FILE), { recursive: true });
  writeFileSync(
    TENANT_FILE,
    JSON.stringify({ userId: user.id, businessId, slug }, null, 2),
  );

  return { userId: user.id, businessId };
}

export default async function globalSetup(config: FullConfig) {
  console.log("\n[e2e] provisioning isolated test tenant…");
  await provisionTenant();

  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const storageState = join(__dirname, ".auth/state.json");

  console.log("[e2e] logging in test user via browser…");
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await page.goto("/login");
  await page.locator("#email").fill(TEST_EMAIL);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // app pushes to /app/dashboard on success
  await page.waitForURL("**/app/dashboard", { timeout: 30_000 });

  await page.context().storageState({ path: storageState });
  await browser.close();
  console.log("[e2e] auth state saved → e2e/.auth/state.json\n");
}
