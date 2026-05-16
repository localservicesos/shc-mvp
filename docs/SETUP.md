# Local setup

This project uses **bun** as its package manager and **Next.js 16** with the App Router. Supabase provides database, auth, and storage.

## Prerequisites

- [Bun](https://bun.sh) `>= 1.3`
- A Supabase project (free tier is fine) — https://supabase.com
- (Optional) The Supabase CLI for applying migrations and managing local environments — https://supabase.com/docs/guides/cli

## 1. Install dependencies

```bash
bun install
```

Always use `bun` — never `npm`, `pnpm`, or `yarn`. Only `bun.lockb` is committed.

## 2. Configure environment variables

Copy the example file and fill in values from your Supabase project (Dashboard → Project Settings → API):

```bash
cp .env.example .env.local
```

| Variable                          | Where it runs | Notes |
| --------------------------------- | ------------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL`        | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | client + server | Anon key, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY`       | server only   | **Never** import from client code |

`.env.local` is gitignored. The only env file committed is `.env.example`.

## 3. Apply the database migration

The schema lives in `supabase/migrations/0001_init.sql`. You can apply it in two ways.

### Option A — Supabase CLI (recommended once we add it)

```bash
supabase db push
```

### Option B — Copy/paste into the SQL editor

1. Open your project in the Supabase Dashboard.
2. SQL Editor → New query.
3. Paste the contents of `supabase/migrations/0001_init.sql` and run it.

## 4. Seed the first business

Until we automate this, manually create the first business and link your auth user as an owner. In the SQL editor:

```sql
-- 1. Create the business
insert into businesses (name, slug, timezone, currency)
values ('Raphael Detailing', 'raphael-detailing', 'Australia/Brisbane', 'AUD')
returning id;

-- 2. Link your auth user as owner (replace USER_UUID and BUSINESS_UUID).
insert into business_members (user_id, business_id, role)
values ('USER_UUID', 'BUSINESS_UUID', 'owner');
```

Your `auth.users` UUID is visible in Dashboard → Authentication → Users.

## 5. Run the dev server

```bash
bun run dev
```

The app is then available at http://localhost:3000.

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
supabase/
  migrations/       SQL migrations (0001_init.sql is the schema)
types/              shared TypeScript types
docs/               this folder
```

## Common gotchas

- **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** The auth session refresher lives in `lib/supabase/proxy.ts`; the root entrypoint will be `proxy.ts` (not `middleware.ts`). See `AGENTS.md`.
- **`cookies()` is async.** Always `await cookies()` in server code.
- **Never import `lib/supabase/server.ts` from a Client Component** — it uses `next/headers`. Use `lib/supabase/client.ts` in the browser.
