# Roadmap

What we are doing now, what comes next for Raphael, and what shapes the future SaaS evolution. Anything not in the **Now** column is intentionally out of MVP scope (see `docs/MVP_SCOPE.md`).

## Now — MVP for Raphael

Operational web app replacing Raphael's paper notebook.

- [x] Auth (email + password via Supabase Auth) and `proxy.ts` session gate
- [x] App layout + side navigation (Settings pinned to the bottom)
- [x] Customers CRUD (with FK-safe delete + confirmation dialog)
- [x] Vehicles linked to customers (unique plate per business)
- [x] Services CRUD
- [x] Jobs CRUD with status flow (`booked` → `completed` / `cancelled`); every job requires a start + end time
- [x] No double-booking the same vehicle — overlapping bookings for one car are rejected server-side and by a Postgres exclusion constraint (migration `0011`); two different cars may share a slot
- [x] Dashboard (today, upcoming, quick "new job")
- [x] Schedule view with correct Brisbane timezone — Day / Week / Month / Year (defaults to Week), 7am–6pm grid, multi-day bookings shown on every day they span
- [~] Job detail with notes (FK-safe delete + confirmation dialog); photo upload built but hidden behind `showPhotos = false` flag in `app/app/jobs/[id]/page.tsx` — flip to `true` to enable
- [x] Per-job fixed-amount discount / extra charge with optional reason note (total = base − discount + extra)
- [x] Invoice generation from a job, mark sent, mark paid, printable page (with GST breakdown + discount/extra line items)
- [x] Email invoices to the customer via Resend (sends logged in `invoice_emails`)
- [x] Business settings page (name, ABN, contact details, logo)
- [x] App-wide toast notifications (errors + success) and a confirm-before-delete dialog on every delete

## Later — quality of life for Raphael (post-MVP, same business)

These are things Raphael will probably ask for in the first weeks of usage.

- Customer search and quick-find by phone / plate
- CSV export of customers and jobs (so he keeps his data even if he leaves)
- Reminder / status-change emails (the Resend integration used for invoice send is already in place to build on)
- Simple revenue summary (this week / this month) without becoming an analytics dashboard
- Backup of his photos (already in Supabase Storage, but document the export path)
- Calendar `.ics` feed of upcoming jobs so he can subscribe from his phone

## Future SaaS — moving beyond Raphael

When we sign business #2, here is the order things become real product work, not config tweaks.

### Onboarding
- Self-serve sign up that creates a `businesses` row and `business_members` row automatically (today this is a manual SQL insert)
- Optional industry "template" (car detailing / cleaning / dog grooming / etc.) that seeds default services

### Tenant & roles
- Promote `staff` role from placeholder to real (per-action RLS, restricted UI)
- Multi-location support per business
- Per-business branding (logo / colors / invoice template)

### Modules to build behind feature flags
- `bookings` — public booking form / link
- `messages` — SMS + broader email notifications (Twilio / Resend; invoice email send via Resend already shipped)
- `payments` — Stripe / Square integration
- `accounting` — Xero / MYOB export
- `dashboard` — revenue, utilisation, repeat-customer analytics
- `automations` — status changes triggering messages
- `ai` — assist with notes, summarise customer history, draft messages

### Platform concerns
- Plan billing (the $39/month + per-job model, applied at the platform level)
- Audit log / activity feed per business
- Public marketing site
- Customer portal (let *Raphael's customers* see their own job history)

The codebase should reach for **configuration over forks**: a new industry is a different default service list and a few field labels, not a new app.
