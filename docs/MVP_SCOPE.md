# MVP scope

The first deliverable is an operational web app for **Raphael's car detailing business** in Australia. It replaces paper/notebook tracking of customers, vehicles, bookings, job status, photos, and a simple invoice flow. It is built on a multi-tenant-shaped foundation so the same codebase can later power other small local service businesses (cleaning, dog grooming, gardening, tradies, mobile services, etc.) without a rewrite.

## In scope

### Operational data
- Customers (name, phone, email, address, notes)
- Vehicles per customer (make, model, year, color, plate, notes)
- Services (name, description, base price, active flag)
- Jobs / bookings linking customer + vehicle + service, with scheduled time and status
- Job photos (before / after / other)
- Invoices generated from a job (draft → sent → paid)

### Pages
1. Login
2. Dashboard — today's jobs, upcoming, in-progress, ready, new-job button
3. Customers list + create / edit
4. Customer detail — info, vehicles, past jobs, add vehicle, add job
5. Jobs list — filter by status, filter by date, create job
6. Job detail — info, status update, notes, generate invoice; photos built but hidden behind `showPhotos` feature flag (see `app/app/jobs/[id]/page.tsx`)
7. Schedule — daily / weekly list view (no drag and drop)
8. Invoice — printable / shareable, mark sent, mark paid

### Platform behaviour
- Email + password login via Supabase Auth
- Server-side data access with RLS scoping everything by `business_id`
- File uploads for job photos via Supabase Storage
- Mobile-responsive admin UI (Tailwind + shadcn/ui)
- Empty / loading / error states everywhere data is fetched

## Explicitly out of scope (for now)

- AI features of any kind
- Advanced analytics dashboards
- SMS automation
- Payment gateway integration (Stripe / Square / etc.)
- Accounting integrations (Xero / MYOB)
- Native mobile apps
- Multi-location support per business
- Complex staff roles / permissions (only `owner` for now, `staff` exists as an enum value but is not yet used)
- Customer-facing portal
- Public booking form
- Marketing website
- Drag-and-drop calendar

Anything outside this list is documented in `docs/ROADMAP.md` and **must not** sneak into the MVP.

## Multi-tenant readiness

Although Raphael is the only customer at launch, every operational table carries `business_id`. RLS policies scope rows to the businesses the auth user belongs to (`business_members`). This means adding a second business later is a data + config change, not a code rewrite.

## Success criteria

The MVP is "done" when Raphael can:

1. Sign in.
2. Add a customer.
3. Add a vehicle for that customer.
4. Schedule a job using one of his services.
5. See that job on the dashboard / schedule.
6. Update its status (booked → in_progress → ready → completed).
7. Attach before/after photos. *(photo UI is built but currently disabled via `showPhotos` flag — enable before shipping)*
8. Generate an invoice from the completed job and mark it sent, then paid.
9. Find all of the above later via the customer's history.

When that flow is reliable, the MVP ships.
