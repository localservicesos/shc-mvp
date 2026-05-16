You are helping me start a real production-oriented MVP web app project.

Project context:
I am starting a digital solutions business with my co-founder Vitor in Australia. We are targeting small local service businesses. The first paying client is a car detailing business owner named Raphael.

Raphael currently manages bookings, customers, schedules, job history and car information manually using paper/notebooks. We closed the first deal with him:
- $39/month subscription
- + $5 per completed job

The goal is NOT to build a huge custom system for only one client.
The goal is to build a simple MVP for Raphael now, but with a clean, configurable foundation that can later evolve into a SaaS platform for other local service businesses such as car detailing, cleaning, dog grooming, gardening, tradies, mobile services, etc.

Important business principles:
- Start simple.
- Solve the main operational pain first.
- Replace paper/manual tracking.
- Avoid overengineering.
- Build configuration, not forks.
- Do not build advanced dashboards, AI, native mobile apps, or complex automations yet.
- The first version is an agency/MVP delivery.
- The foundation should allow evolution into a configurable product and later SaaS.

Initial MVP goal:
Build a simple web app for a car detailing business to manage:
1. Customers
2. Vehicles
3. Jobs/bookings
4. Schedule
5. Job status
6. Job history
7. Car photos
8. Simple invoice flow when a car is ready

Core operational flow:
Customer is created → Vehicle is added → Job/booking is scheduled → Job appears in schedule → Status is updated → Photos/notes are added → Job is marked as Ready → Invoice is generated/sent/marked as paid → Job becomes part of customer history.

Tech stack:
Use:
- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui for component styles (installed via `bunx shadcn@latest`)
- Supabase for database, auth and storage
- PostgreSQL schema designed for future multi-tenant SaaS
- Server-side Supabase usage where appropriate
- Simple, clean, responsive UI

Package manager:
- Use bun for all installs, scripts, and runtime tooling (e.g. `bun install`, `bun add`, `bun run dev`, `bunx create-next-app`).
- Do not use npm, pnpm, or yarn. Do not commit `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` — only `bun.lockb`.
- Document bun-based commands in `docs/SETUP.md`.

UI components:
- Use shadcn/ui for UI primitives (buttons, inputs, dialogs, tables, etc.) on top of Tailwind.
- Initialize once with `bunx shadcn@latest init`, then add components on demand with `bunx shadcn@latest add <component>`.
- Place generated components under `components/ui/` per the project structure.
- Prefer composing shadcn primitives over hand-rolling base components; keep custom styling minimal and Tailwind-based.

Workflow — commit per step:
- Every implementation step from this CLAUDE.md (scaffold, folder structure, Supabase utils, migrations, docs, auth, each CRUD module, dashboard, schedule, invoices, photos, etc.) must be its own git commit.
- Use conventional commit messages (feat, fix, chore, refactor, docs, etc.) with the subject line under 72 chars.
- Do not bundle multiple steps into one commit. Do not skip committing a step before moving to the next.
- Never include a `Co-Authored-By` trailer.

Next.js version notes:
- This project uses Next.js 16+ which has breaking changes from older versions. See `AGENTS.md` and check `node_modules/next/dist/docs/` before writing Next-specific code that you are not 100% sure about.

Do not use:
- Complex state management unless necessary
- Native mobile app
- AI features
- Advanced analytics dashboard
- Payment integration in the first version
- Xero/MYOB/Stripe/Square integration yet
- Complex roles/permissions yet
- Drag-and-drop calendar yet

Important architecture requirement:
Even though the first client is only Raphael, design the database with `business_id` on the main operational tables so the app can later support multiple businesses without rewriting everything.

Suggested database entities:
- businesses
- profiles or users/business_members
- customers
- vehicles
- services
- jobs
- job_photos
- invoices

Suggested fields:

businesses:
- id
- name
- slug
- timezone, default Australia/Brisbane
- currency, default AUD
- created_at

profiles or business_members:
- id
- user_id
- business_id
- role, default owner
- created_at

customers:
- id
- business_id
- name
- phone
- email
- address
- notes
- created_at
- updated_at

vehicles:
- id
- business_id
- customer_id
- make
- model
- year
- color
- plate
- notes
- created_at
- updated_at

services:
- id
- business_id
- name
- description
- base_price
- active
- created_at
- updated_at

jobs:
- id
- business_id
- customer_id
- vehicle_id
- service_id
- scheduled_start
- scheduled_end
- status
- price
- notes
- created_at
- updated_at

Job statuses:
- booked
- in_progress
- ready
- completed
- cancelled

job_photos:
- id
- business_id
- job_id
- photo_url
- type: before, after, other
- caption
- created_at

invoices:
- id
- business_id
- job_id
- invoice_number
- amount
- status: draft, sent, paid, void
- sent_at
- paid_at
- created_at
- updated_at

MVP pages:
1. Login page
2. App dashboard
   - show today’s jobs
   - upcoming jobs
   - jobs in progress
   - jobs ready
   - button to create new job
3. Customers page
   - list customers
   - create customer
   - edit customer
   - view customer details
   - show customer job history
   - show customer vehicles
4. Customer detail page
   - customer info
   - vehicles
   - past jobs
   - create new vehicle
   - create new job for this customer
5. Jobs page
   - list jobs
   - filter by status
   - filter by date
   - create job
6. Job detail page
   - job info
   - customer
   - vehicle
   - service
   - scheduled time
   - price
   - status update
   - notes
   - upload/view job photos
   - generate invoice when status is ready
7. Schedule page
   - simple daily/weekly list view
   - no drag-and-drop yet
8. Invoice page
   - simple invoice display
   - customer details
   - vehicle details
   - service/job details
   - amount
   - status
   - mark as sent
   - mark as paid

Invoice requirements for MVP:
Do not implement real payment processing yet.
Create a simple invoice record and a printable/shareable invoice page.
Add placeholders/TODOs for future email integration.
The workflow should support:
- Generate invoice from job
- Mark invoice as sent
- Mark invoice as paid

Photo requirements:
Use Supabase Storage.
Create a bucket concept for job photos.
Allow uploading photos connected to a job.
Support photo type:
- before
- after
- other

UI requirements:
- Clean admin-style UI
- Mobile responsive web app
- Simple navigation sidebar or top nav
- Use practical forms and tables
- Use empty states
- Use loading/error states where needed
- Keep design simple and professional

Implementation approach:
Before coding, inspect the current repository.
If the project is empty:
1. Scaffold the Next.js project.
2. Set up TypeScript and Tailwind.
3. Create the folder structure.
4. Create Supabase client utilities.
5. Create SQL migration files for the database schema.
6. Create basic pages and components.
7. Implement the first working CRUD flows.

If the project already exists:
1. Analyze the structure.
2. Propose the changes.
3. Then implement without rewriting unnecessary parts.

Expected folder structure:
- app/
  - login/
  - app/
    - dashboard/
    - customers/
    - customers/[id]/
    - jobs/
    - jobs/[id]/
    - schedule/
    - invoices/[id]/
- components/
  - ui/
  - layout/
  - forms/
  - tables/
- lib/
  - supabase/
  - db/
  - utils/
- types/
- supabase/
  - migrations/
- docs/

Create docs:
1. docs/MVP_SCOPE.md
   - explain what is included and excluded from MVP
2. docs/DATABASE_SCHEMA.md
   - explain tables and relationships
3. docs/SETUP.md
   - explain how to run locally and configure Supabase env vars
4. docs/ROADMAP.md
   - separate future work into:
     - Now
     - Later
     - Future SaaS

Environment variables:
Use placeholders and document them:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY if needed, but avoid using it on the client

Security:
- Do not expose service role key in the browser.
- Add basic Supabase RLS policy examples or migration placeholders.
- Keep all main records scoped by business_id.
- Keep the first implementation simple but not careless.

Important MVP boundaries:
Do NOT build these yet:
- AI assistant
- Advanced dashboard
- SMS automation
- Payment gateway
- Accounting integration
- Native mobile app
- Multi-location support
- Complex staff permissions
- Customer portal
- Public booking form
- Marketing website

Future SaaS direction:
Design the codebase so that later we can add configurable modules:
- bookings
- customers
- services
- jobs
- payments
- messages
- dashboard
- automations
- AI

But for now, only implement the operational MVP for Raphael.

First milestone:
Create a working foundation with:
- Auth structure
- Database migration
- Business-aware schema
- Customers CRUD
- Vehicles linked to customers
- Services CRUD
- Jobs CRUD
- Basic dashboard
- Basic schedule list
- Job detail with status update
- Basic invoice generation
- Photo upload structure if feasible

If the full implementation is too large for one pass, prioritize:
1. Database schema
2. App structure
3. Customers
4. Vehicles
5. Jobs
6. Schedule
7. Invoices
8. Photos

After implementing, provide:
- Summary of what was created
- Files changed
- How to run the app
- What still needs to be completed
- Recommended next development step

Please start by analyzing the repository and creating a practical implementation plan. Then begin implementing the MVP foundation.
