/**
 * scripts/backup-db.ts
 *
 * Dumps every operational table to a timestamped JSON file under
 * scripts/backups/ using the service-role key (bypasses RLS). Use this before
 * any destructive operation on the remote database.
 *
 *   bun scripts/backup-db.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TABLES = [
  "businesses",
  "business_members",
  "customers",
  "vehicles",
  "services",
  "jobs",
  "job_photos",
  "invoices",
] as const;

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  const text = readFileSync(join(import.meta.dir, "../.env.local"), "utf-8");
  for (const line of text.split("\n")) {
    const i = line.indexOf("=");
    if (i < 0 || line.trim().startsWith("#")) continue;
    out[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

const e = env();
const sb = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const dump: Record<string, unknown[]> = {};
for (const t of TABLES) {
  const { data, error } = await sb.from(t).select("*");
  if (error) throw new Error(`${t}: ${error.message}`);
  dump[t] = data ?? [];
  console.log(`  ${t.padEnd(16)} ${dump[t].length} rows`);
}

const dir = join(import.meta.dir, "backups");
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = join(dir, `backup-${stamp}.json`);
writeFileSync(file, JSON.stringify(dump, null, 2));
console.log(`\n✓ backup written → ${file}`);
