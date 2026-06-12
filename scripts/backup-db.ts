/**
 * scripts/backup-db.ts
 *
 * Local Supabase/Postgres backup helper.
 *
 * Usage:
 *   bun run backup:db
 *   bun run backup:list
 *   bun run backup:verify -- backups/database/<file>.dump
 *   bun run backup:restore -- backups/database/<file>.dump --confirm-restore
 *
 * Requires:
 *   - DATABASE_BACKUP_URL or DATABASE_URL in .env.local
 *   - pg_dump and pg_restore installed locally
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const BACKUP_DIR = join(import.meta.dir, "../backups/database");
const ENV_FILE = join(import.meta.dir, "../.env.local");
const HOMEBREW_PREFIXES = ["/opt/homebrew", "/usr/local"];
const POSTGRES_VERSIONS = ["17", "16", "15", "14"];

type PgTool = "pg_dump" | "pg_restore";

type ResolvedTool = {
  command: string;
  major: number;
  version: string;
};

function usage(): void {
  console.log(`
Database backup commands

  bun run backup:db
    Create a timestamped local database backup.

  bun run backup:list
    Show local backup files.

  bun run backup:verify -- backups/database/<file>.dump
    Check that a backup file can be read by pg_restore.

  bun run backup:restore -- backups/database/<file>.dump --confirm-restore
    Restore a backup into DATABASE_URL. This can overwrite current data.

Backups are saved locally in:
  ${BACKUP_DIR}
`);
}

function readEnvFile(): Record<string, string> {
  if (!existsSync(ENV_FILE)) return {};

  const values: Record<string, string> = {};
  const text = readFileSync(ENV_FILE, "utf-8");

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index < 0) continue;

    const key = line.slice(0, index).trim();
    const value = line
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    values[key] = value;
  }

  return values;
}

function getDatabaseUrl(): string {
  const env = readEnvFile();
  const databaseUrl =
    env.DATABASE_BACKUP_URL ||
    process.env.DATABASE_BACKUP_URL ||
    env.DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(`
DATABASE_BACKUP_URL or DATABASE_URL is not set.

Add it to .env.local:
  DATABASE_BACKUP_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

Find it in:
  Supabase Dashboard -> Settings -> Database -> Connection string -> URI
`);
    process.exit(1);
  }

  return databaseUrl;
}

function preparePgToolUrl(databaseUrl: string): string {
  const unsupportedParams = ["pgbouncer", "connection_limit", "pool_timeout"];

  try {
    const url = new URL(databaseUrl);
    const removed = unsupportedParams.filter((param) => url.searchParams.has(param));

    for (const param of removed) {
      url.searchParams.delete(param);
    }

    if (removed.length > 0) {
      console.warn(
        `Removed unsupported pg_dump URL parameter(s): ${removed.join(", ")}`
      );
    }

    if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") {
      console.warn(
        "Warning: this looks like Supabase's transaction pooler. If pg_dump fails, set DATABASE_BACKUP_URL to the direct connection URI."
      );
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function redactDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (url.password) url.password = "********";
    return url.toString();
  } catch {
    return "DATABASE_URL";
  }
}

function formatStamp(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + "-" + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function toolCandidates(command: PgTool): string[] {
  const envOverride =
    command === "pg_dump" ? process.env.PG_DUMP_PATH : process.env.PG_RESTORE_PATH;

  const candidates = [
    envOverride,
    ...HOMEBREW_PREFIXES.flatMap((prefix) =>
      POSTGRES_VERSIONS.map((version) =>
        join(prefix, "opt", `postgresql@${version}`, "bin", command)
      )
    ),
    ...HOMEBREW_PREFIXES.map((prefix) => join(prefix, "opt", "libpq", "bin", command)),
    command,
  ].filter((candidate): candidate is string => Boolean(candidate));

  return [...new Set(candidates)];
}

function inspectTool(command: string): ResolvedTool | null {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.error || result.status !== 0) return null;

  const version = `${result.stdout}${result.stderr}`.trim();
  const match = version.match(/(\d+)(?:\.\d+)?/);
  const major = match ? Number(match[1]) : 0;

  return { command, major, version };
}

function resolveTool(command: PgTool): string {
  const tools = toolCandidates(command)
    .map(inspectTool)
    .filter((tool): tool is ResolvedTool => Boolean(tool))
    .sort((a, b) => b.major - a.major);

  const tool = tools[0];

  if (!tool) {
    console.error(`
${command} is not available on this machine.

Install PostgreSQL client tools, then run this command again.

On macOS with Homebrew:
  brew install postgresql@17
`);
    process.exit(1);
  }

  console.log(`Using ${command}: ${tool.command} (${tool.version})`);
  return tool.command;
}

function runOrExit(command: string, args: string[], allowWarnings = false): void {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  // pg_restore exits 1 for warnings (e.g. Supabase system objects it can't touch),
  // and exits 2 for real errors. Treat 1 as success when allowWarnings is set.
  const failed = allowWarnings
    ? (result.status ?? 0) >= 2
    : result.status !== 0;

  if (failed) {
    process.exit(result.status ?? 1);
  }
}

function runBackupOrExit(command: string, args: string[], file: string): void {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    stdio: "inherit",
  });

  if (result.error) {
    if (existsSync(file)) unlinkSync(file);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (existsSync(file) && statSync(file).size === 0) {
      unlinkSync(file);
    }
    process.exit(result.status ?? 1);
  }
}

function backupFiles(): string[] {
  if (!existsSync(BACKUP_DIR)) return [];

  return readdirSync(BACKUP_DIR)
    .filter((file) => file.endsWith(".dump"))
    .map((file) => join(BACKUP_DIR, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value = value / 1024;
    unit++;
  }

  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function createBackup(): void {
  const pgDump = resolveTool("pg_dump");

  const databaseUrl = preparePgToolUrl(getDatabaseUrl());
  mkdirSync(BACKUP_DIR, { recursive: true });

  const file = join(BACKUP_DIR, `supabase-${formatStamp(new Date())}.dump`);

  console.log("\nCreating database backup...");
  console.log(`Database: ${redactDatabaseUrl(databaseUrl)}`);
  console.log(`File:     ${file}\n`);

  runBackupOrExit(pgDump, [
    databaseUrl,
    "--format=custom",
    "--blobs",
    "--no-owner",
    "--no-acl",
    "--file",
    file,
  ], file);

  const stats = statSync(file);

  console.log(`
Backup complete.
File: ${file}
Size: ${formatBytes(stats.size)}

Keep this file private. It may contain customer and business data.
`);
}

function listBackups(): void {
  const files = backupFiles();

  if (files.length === 0) {
    console.log(`\nNo database backups found in ${BACKUP_DIR}\n`);
    return;
  }

  console.log(`\nDatabase backups in ${BACKUP_DIR}\n`);
  for (const file of files) {
    const stats = statSync(file);
    console.log(`${basename(file).padEnd(36)} ${formatBytes(stats.size).padStart(9)}  ${stats.mtime.toLocaleString()}`);
  }
  console.log("");
}

function resolveBackupArg(fileArg: string | undefined): string {
  if (!fileArg) {
    console.error("\nMissing backup file path.\n");
    usage();
    process.exit(1);
  }

  if (fileArg.includes("--confirm-restore")) {
    console.error(`
The restore confirmation flag is attached to the backup file path.

Use a space before --confirm-restore:
  bun run backup:restore -- ${fileArg.replace("--confirm-restore", "")} --confirm-restore
`);
    process.exit(1);
  }

  const file = resolve(fileArg);
  if (!existsSync(file)) {
    console.error(`\nBackup file not found: ${file}\n`);
    process.exit(1);
  }

  return file;
}

function verifyBackup(fileArg: string | undefined): void {
  const pgRestore = resolveTool("pg_restore");

  const file = resolveBackupArg(fileArg);

  console.log(`\nVerifying backup: ${file}\n`);
  runOrExit(pgRestore, ["--list", file]);
  console.log("\nBackup file is readable by pg_restore.\n");
}

function restoreBackup(args: string[]): void {
  const pgRestore = resolveTool("pg_restore");

  const file = resolveBackupArg(args[0]);
  const confirmed = args.includes("--confirm-restore");

  if (!confirmed) {
    console.error(`
Restore is intentionally protected because it can overwrite current data.

To restore this file, re-run with:
  bun run backup:restore -- ${file} --confirm-restore
`);
    process.exit(1);
  }

  const databaseUrl = preparePgToolUrl(getDatabaseUrl());

  console.log("\nRestoring database backup...");
  console.log(`Database: ${redactDatabaseUrl(databaseUrl)}`);
  console.log(`File:     ${file}\n`);

  runOrExit(pgRestore, [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    "--dbname",
    databaseUrl,
    file,
  ], true);

  console.log("\nRestore complete.\n");
}

const command = process.argv[2] ?? "create";
const args = process.argv.slice(3);

if (command === "create") {
  createBackup();
} else if (command === "list") {
  listBackups();
} else if (command === "verify") {
  verifyBackup(args[0]);
} else if (command === "restore") {
  restoreBackup(args);
} else if (command === "help" || command === "--help" || command === "-h") {
  usage();
} else {
  console.error(`Unknown backup command: ${command}`);
  usage();
  process.exit(1);
}
