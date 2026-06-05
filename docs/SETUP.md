# Local setup

This project uses **bun** as its package manager and **Next.js 16** with the App Router. Supabase provides database, auth, and storage.

## Prerequisites

- [Bun](https://bun.sh) `>= 1.3`
- A Supabase project (free tier is fine) — https://supabase.com

## 1. Install dependencies

```bash
bun install
```

Always use `bun` — never `npm`, `pnpm`, or `yarn`. Only `bun.lockb` is committed.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your values from the Supabase Dashboard:

| Variable | Where to find it | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | App (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon / public | App (client + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | Server scripts only — **never expose in browser** |
| `DATABASE_URL` | Settings → Database → Connection string (URI) | `bun run migrate:*` scripts only |
| `RESEND_API_KEY` | Resend → API Keys | Server invoice email sending |
| `INVOICE_FROM_EMAIL` | Verified Resend domain | Sender shown to invoice recipients |
| `INVOICE_REPLY_TO_EMAIL` | Business inbox | Optional reply-to for invoice emails |

`.env.local` is gitignored. Only `.env.example` is committed.

## 3. Apply database migrations

Migrations live in `supabase/migrations/` and are tracked in a `schema_migrations` table.

### Check what's applied

```bash
bun run migrate:status
```

Example output:
```
  Migration status
  ────────────────────────────────────
  ✅  applied   0001_init.sql
  ✅  applied   0002_job_photos_storage.sql
  ✅  applied   0003_invoices_job_unique.sql
  ❌  PENDING   0004_businesses_contact_fields.sql
  ❌  PENDING   0005_data_quality_constraints.sql
  ────────────────────────────────────
  ⚠️  2 pending. Run: bun run migrate:run
```

### Apply pending migrations

```bash
bun run migrate:run
```

This runs each pending `.sql` file in order and records it in `schema_migrations`.
If a migration fails, it stops and tells you which file and what the error was.

> **First time only:** `DATABASE_URL` must be set in `.env.local`. Get it from:
> Supabase Dashboard → Settings → Database → Connection string (URI)
> Format: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

### Adding a new migration

1. Create `supabase/migrations/XXXX_description.sql` (increment the number prefix).
2. Write your SQL.
3. Run `bun run migrate:run` — the script picks it up automatically.

## 4. Seed the first business

After applying migrations, seed the first business record:

1. Open **Supabase Dashboard → SQL Editor**.
2. Paste and run the contents of `supabase/seed.sql`.
3. Replace the placeholder UUIDs at the top with your actual auth user ID (Dashboard → Authentication → Users).

## 5. Run the dev server

```bash
bun run dev
```

The app is available at http://localhost:3000.

## 6. Build / lint

```bash
bun run build
bun run lint
```

## Folder structure (overview)

```
app/                Next.js App Router (login, dashboard, customers, jobs, etc.)
components/         UI primitives (shadcn under components/ui), layout, forms, tables
lib/
  supabase/         browser, server, and proxy auth clients
  db/               query helpers
  utils/            general utilities
scripts/
  migrate.ts        migration runner (bun run migrate:status / migrate:run)
supabase/
  migrations/       SQL migrations (numbered 0001_, 0002_, etc.)
  seed.sql          first-business seed data
types/              shared TypeScript types
docs/               this folder
```

## Common gotchas

- **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** The auth session refresher lives in `lib/supabase/proxy.ts`; the root entrypoint will be `proxy.ts` (not `middleware.ts`). See `AGENTS.md`.
- **`cookies()` is async.** Always `await cookies()` in server code.
- **Never import `lib/supabase/server.ts` from a Client Component** — it uses `next/headers`. Use `lib/supabase/client.ts` in the browser.
- **`DATABASE_URL` is only for the migration script.** It is never imported by the Next.js app. The app uses `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` only.
