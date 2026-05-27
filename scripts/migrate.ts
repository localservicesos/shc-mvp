/**
 * scripts/migrate.ts
 *
 * Usage:
 *   bun run migrate:status   — show which migrations are applied / pending
 *   bun run migrate:run      — apply all pending migrations in order
 *
 * Requires DATABASE_URL in .env.local:
 *   Supabase Dashboard → Settings → Database → Connection string (URI)
 *   Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

// ── Config ────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = join(import.meta.dir, "../supabase/migrations");
const MIGRATIONS_TABLE = "schema_migrations";

function getDbUrl(): string {
  // Load .env.local manually (bun does not auto-load it for scripts)
  const envPath = join(import.meta.dir, "../.env.local");
  try {
    const text = require("node:fs").readFileSync(envPath, "utf-8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
        return trimmed.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // file not found — fall through to process.env
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "\n❌  DATABASE_URL is not set.\n\n" +
      "Add it to .env.local:\n" +
      "  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres\n\n" +
      "Find it in: Supabase Dashboard → Settings → Database → Connection string (URI)\n"
    );
    process.exit(1);
  }
  return url;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort(); // alphabetical = chronological for 0001_, 0002_, etc.
}

async function ensureMigrationsTable(sql: postgres.Sql): Promise<void> {
  await sql`
    create table if not exists ${sql(MIGRATIONS_TABLE)} (
      name        text primary key,
      applied_at  timestamptz not null default now()
    )
  `;
}

async function getAppliedMigrations(sql: postgres.Sql): Promise<Set<string>> {
  const rows = await sql<{ name: string }[]>`
    select name from ${sql(MIGRATIONS_TABLE)} order by name
  `;
  return new Set(rows.map((r) => r.name));
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function status(): Promise<void> {
  const sql = postgres(getDbUrl(), { max: 1 });
  try {
    await ensureMigrationsTable(sql);
    const [files, applied] = await Promise.all([
      getMigrationFiles(),
      getAppliedMigrations(sql),
    ]);

    console.log("\n  Migration status\n  ────────────────────────────────────");
    let pendingCount = 0;
    for (const file of files) {
      const isApplied = applied.has(file);
      const icon = isApplied ? "✅" : "❌";
      const label = isApplied ? "applied " : "PENDING ";
      console.log(`  ${icon}  ${label}  ${file}`);
      if (!isApplied) pendingCount++;
    }
    console.log("  ────────────────────────────────────");
    if (pendingCount === 0) {
      console.log("  ✨ All migrations are up to date.\n");
    } else {
      console.log(`  ⚠️  ${pendingCount} pending. Run: bun run migrate:run\n`);
    }
  } finally {
    await sql.end();
  }
}

async function run(): Promise<void> {
  const sql = postgres(getDbUrl(), { max: 1 });
  try {
    await ensureMigrationsTable(sql);
    const [files, applied] = await Promise.all([
      getMigrationFiles(),
      getAppliedMigrations(sql),
    ]);

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("\n  ✨ Nothing to apply — all migrations are up to date.\n");
      return;
    }

    console.log(`\n  Applying ${pending.length} pending migration(s)...\n`);

    for (const file of pending) {
      const filePath = join(MIGRATIONS_DIR, file);
      const sqlText = await readFile(filePath, "utf-8");

      process.stdout.write(`  ⏳  ${file} ... `);
      try {
        // Run the migration SQL, then record it — both in the same transaction.
        await sql.begin(async (tx) => {
          await tx.unsafe(sqlText);
          await tx`insert into ${tx(MIGRATIONS_TABLE)} (name) values (${file})`;
        });
        console.log("✅  done");
      } catch (err) {
        console.log("❌  FAILED");
        console.error(`\n  Error in ${file}:\n  ${(err as Error).message}\n`);
        console.error("  ⚠️  Stopped. Fix the migration above and re-run.\n");
        process.exit(1);
      }
    }

    console.log("\n  ✨ All migrations applied successfully.\n");
  } finally {
    await sql.end();
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

const command = process.argv[2] ?? "status";

if (command === "status") {
  await status();
} else if (command === "run") {
  await run();
} else {
  console.error(`Unknown command: ${command}. Use "status" or "run".`);
  process.exit(1);
}
