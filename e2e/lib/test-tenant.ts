/**
 * Shared helpers for the E2E test tenant.
 *
 * Everything here runs OUTSIDE the browser (Node), using the Supabase
 * service-role key — which bypasses RLS. We use it only to:
 *   1. provision a throwaway test user + business before the suite, and
 *   2. delete that business (cascade) + user after the suite.
 *
 * The browser tests themselves never see the service-role key; they log in
 * as the test user and are fully constrained by RLS, exactly like a real business owner.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── env loading (bun/node don't auto-load .env.local for Playwright) ──────────

function loadEnv(): Record<string, string> {
  const envPath = join(__dirname, "../../.env.local");
  const out: Record<string, string> = {};
  const text = readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    out[key] = val;
  }
  return out;
}

const env = loadEnv();

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "E2E setup needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

// Stable, recognizable identity for the test tenant.
export const TEST_EMAIL = "e2e+autotest@local-service-os.test";
export const TEST_PASSWORD = "e2e-Test-Password-123!";
export const TEST_BUSINESS_NAME = "__E2E__ Auto Test Detailing";
// Where setup writes the created business id so teardown can find it.
export const TENANT_FILE = join(__dirname, "../.auth/tenant.json");

export function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Find the test auth user by email, if it already exists. */
export async function findTestUser(sb: SupabaseClient) {
  // listUsers is paginated; the test inbox is tiny so page 1 is enough,
  // but we scan a few pages defensively.
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === TEST_EMAIL);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}
