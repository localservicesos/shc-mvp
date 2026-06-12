# Database Backups

This project runs on Supabase Postgres. The Supabase Free plan does not include
managed database backups, so production data should be backed up manually from a
trusted local machine.

Backups are created on your Mac, not inside Vercel. Vercel should not be used to
store backup files because its runtime filesystem is temporary.

## Requirements

1. `DATABASE_BACKUP_URL` or `DATABASE_URL` must exist in `.env.local`.
2. PostgreSQL client tools must be installed locally.

`DATABASE_BACKUP_URL` should use a direct Supabase Postgres connection when
possible. It is available in:

```text
Supabase Dashboard -> Settings -> Database -> Connection string -> URI
```

It should look like this:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
DATABASE_BACKUP_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

Use `DATABASE_BACKUP_URL` if your app's `DATABASE_URL` uses a pooler URL such as
`aws-...pooler.supabase.com:6543/postgres?pgbouncer=true`. That transaction
pooler URL is useful for application traffic, but `pg_dump` works best with a
direct or session-style database connection.

On macOS, install the required PostgreSQL tools with Homebrew:

```bash
brew install postgresql@17
```

The backup script automatically prefers the newest Homebrew-installed
`pg_dump`/`pg_restore` it can find. This matters because `pg_dump` must be the
same major version or newer than the Supabase Postgres server.

## Create A Backup

Run this from the project root:

```bash
bun run backup:db
```

The backup is saved locally in:

```text
backups/database/
```

Example:

```text
backups/database/supabase-2026-06-12-153000.dump
```

The backup uses PostgreSQL's custom dump format. This is better than a plain SQL
file for restore workflows because it is compact and works with `pg_restore`.

## Automatic Backup Before Migrations

`bun run migrate:run` creates a database backup before applying pending
migrations.

The migration script stops if the backup fails, so migrations are not applied
without a fresh safety copy.

## List Backups

```bash
bun run backup:list
```

## Verify A Backup

```bash
bun run backup:verify -- backups/database/supabase-YYYY-MM-DD-HHMMSS.dump
```

Verification checks that `pg_restore` can read the file. It does not modify the
database.

## Restore A Backup

Restoring can overwrite current database objects and data. Only run this when
you intentionally want to restore the database pointed to by
`DATABASE_BACKUP_URL` or `DATABASE_URL`.

Before restoring, create a fresh backup of the current database:

```bash
bun run backup:db
```

That gives you a safety copy of the database exactly as it was before the
restore.

Then list the available backup files:

```bash
bun run backup:list
```

Restore the selected `.dump` file:

```bash
bun run backup:restore -- backups/database/supabase-YYYY-MM-DD-HHMMSS.dump --confirm-restore
```

Example:

```bash
bun run backup:restore -- backups/database/supabase-2026-06-12-130036.dump --confirm-restore
```

The `--confirm-restore` flag is required on purpose. It makes the command harder
to run by accident because a restore can replace or delete current database
objects and data.

The restore target comes from `.env.local`:

1. `DATABASE_BACKUP_URL`, when it exists.
2. `DATABASE_URL`, when `DATABASE_BACKUP_URL` is not set.

Mental model:

```text
backup file -> pg_restore -> Supabase database configured in .env.local
```

## What Is Included

This backs up the PostgreSQL database reachable through `DATABASE_URL`, including
your app tables and database metadata that the connected role can read.

## What Is Not Included

Supabase Storage files are not database rows. The database stores Storage
metadata, but the actual uploaded files must be backed up separately if the app
depends on them.

## Recommended Routine

Create a backup:

- before running migrations
- before changing seed data
- before manually editing production data
- every day once the app is handling real customer/job/invoice data

Keep backup files private. They may contain customers, vehicles, invoices, jobs,
emails, and other business data.

## Daily 11 PM Backup Schedule

On macOS, install the daily backup schedule with:

```bash
bun run backup:schedule:install
```

This installs a LaunchAgent that runs:

```bash
bun run backup:db
```

every day at **11:15 PM local machine time**.

Because this project is configured for Australia/Brisbane, keep the Mac timezone
set to Australia/Brisbane if you want the schedule to match Brisbane time.

Check the schedule with:

```bash
bun run backup:schedule:status
```

Remove the schedule with:

```bash
bun run backup:schedule:uninstall
```

Daily scheduler logs are saved in:

```text
backups/logs/
```

Important: scheduled backups run from your Mac, not from Vercel. If the Mac is
off, the backup cannot run at that time. If the Mac is asleep, launchd normally
runs the missed job when the Mac wakes.
