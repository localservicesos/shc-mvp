# Roadmap

What we are doing now, what comes next for Raphael, and what shapes the future SaaS evolution. Anything not in the **Now** column is intentionally out of MVP scope (see `docs/MVP_SCOPE.md`).

## Now — MVP for Raphael

Operational web app replacing Raphael's paper notebook.

- [x] Auth (email + password via Supabase Auth) and `proxy.ts` session gate
- [x] App layout + side navigation
- [x] Customers CRUD (with FK-safe delete + inline error)
- [x] Vehicles linked to customers (unique plate per business)
- [x] Services CRUD
- [x] Jobs CRUD with status flow (`booked` → `in_progress` → `ready` → `completed` / `cancelled`)
- [x] Dashboard (today, upcoming, in-progress, ready, quick "new job")
- [x] Schedule view (daily / weekly list with correct Brisbane timezone)
- [~] Job detail with notes (FK-safe delete + inline error); photo upload built but hidden behind `showPhotos = false` flag in `app/app/jobs/[id]/page.tsx` — flip to `true` to enable
- [x] Invoice generation from a job, mark sent, mark paid, printable page (with GST breakdown)

## Later — quality of life for Raphael (post-MVP, same business)

These are things Raphael will probably ask for in the first weeks of usage.

- Customer search and quick-find by phone / plate
- CSV export of customers and jobs (so he keeps his data even if he leaves)
- Reminder emails when a job is marked `ready`
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
- `messages` — SMS + email notifications (Twilio / Resend)
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
