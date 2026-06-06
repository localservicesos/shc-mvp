/**
 * scripts/run-sql.ts — run a .sql file against the project database.
 *
 *   bun scripts/run-sql.ts scripts/create-owner-user.sql
 *
 * Uses DATABASE_URL from .env.local. Prints any NOTICE messages so DO-block
 * RAISE NOTICE output is visible.
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function dbUrl(): string {
  const text = readFileSync(join(import.meta.dir, "../.env.local"), "utf-8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.startsWith("DATABASE_URL=")) {
      return t.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("DATABASE_URL not set in .env.local");
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: bun scripts/run-sql.ts <path-to.sql>");
  process.exit(1);
}

const sqlText = readFileSync(file, "utf-8");
const sql = postgres(dbUrl(), {
  prepare: false,
  onnotice: (n) => console.log("NOTICE:", n.message),
});

try {
  await sql.unsafe(sqlText);
  console.log(`✅ ran ${file}`);
} catch (e) {
  console.error("❌ SQL failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
