# Local Service OS

An operational web app for small local service businesses, starting with
**Raphael's car detailing business** in Australia. It replaces paper/notebook
tracking of customers, vehicles, bookings, job status, photos, and a simple
invoice flow — on a multi-tenant-shaped foundation that can later power other
verticals (cleaning, dog grooming, gardening, tradies, mobile services).

See [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md) for what is in and out of scope, and
[docs/ROADMAP.md](docs/ROADMAP.md) for what comes next.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) — Postgres (with RLS), Auth, Storage
- [bun](https://bun.sh) as the package manager and runtime

> **Heads up:** this project uses Next.js 16, which has breaking changes from
> older versions. See [AGENTS.md](AGENTS.md) and check
> `node_modules/next/dist/docs/` before writing Next-specific code.

## Features

- Customers, vehicles, and services CRUD
- Jobs / bookings with a `booked → completed / cancelled` status flow
- Per-job fixed-amount **discount / extra charge** with an optional reason note
  (job total = base price − discount + extra)
- Dashboard (today, upcoming, in-progress, ready) and a timezone-correct
  schedule view
- Invoice generation from a job — GST breakdown, discount/extra line items,
  mark sent / paid, printable page
- Job photo upload via Supabase Storage (built, currently behind a feature flag)

## Getting started

This project uses **bun** — never `npm`, `pnpm`, or `yarn`.

```bash
bun install            # install dependencies
bun run migrate:run    # apply database migrations (needs DATABASE_URL)
bun run dev            # start the dev server at http://localhost:3000
```

Full setup — environment variables, Supabase configuration, and seeding the
first business — is documented in [docs/SETUP.md](docs/SETUP.md).

## Useful commands

```bash
bun run dev             # dev server
bun run build           # production build
bun run lint            # eslint
bun run migrate:status  # show applied / pending migrations
bun run migrate:run     # apply pending migrations
```

## Documentation

- [docs/SETUP.md](docs/SETUP.md) — local setup and configuration
- [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md) — in/out of scope
- [docs/ROADMAP.md](docs/ROADMAP.md) — now / later / future SaaS
- [docs/diagrams/HLD.md](docs/diagrams/HLD.md) — high-level design
- [docs/diagrams/LLD.md](docs/diagrams/LLD.md) — low-level design
- [docs/database-docs/DATABASE_ISSUES.md](docs/database-docs/DATABASE_ISSUES.md) — schema audit
