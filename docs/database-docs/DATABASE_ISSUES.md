# Database Schema — Issues & Future Risks

> Full audit of `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, and
> the application DB layer in `lib/db/`. Issues are grouped by severity.
>
> **Legend:** ✅ Fixed · 🔴 Critical · 🟠 Important · 🟡 Missing · 🔵 Future SaaS

---

## 🔴 CRITICAL — Fix before going live

### 1. No INSERT policy on `businesses` (RLS gap)
**File:** `0001_init.sql` lines 247–254  
**Status:** ⏭️ Skipped — single-business MVP; seed runs as service role

The migration creates `SELECT` and `UPDATE` policies for `businesses` — but
**no `INSERT` policy**. The seed works because it runs as a superuser (service
role). Any future onboarding flow that tries to create a new business via the
authenticated client will silently get a **policy violation / 403**.

```sql
-- Missing — add this:
create policy "businesses can be created by authenticated users"
  on businesses for insert
  with check (true); -- tighten later when onboarding flow is built
```

---

### 2. No INSERT / UPDATE / DELETE policies on `business_members` (RLS gap)
**File:** `0001_init.sql` lines 258–260  
**Status:** ⏭️ Skipped — single-business MVP; seed runs as service role

Only a `SELECT` policy exists. The consequence:
- Adding a staff member via the client API **will fail**.
- The owner cannot leave or transfer ownership via the client.
- Future multi-user onboarding is **blocked at the DB layer**.

```sql
-- Missing — add these:
create policy "members can be inserted by authenticated users"
  on business_members for insert
  with check (business_id in (select current_business_ids()));

create policy "members can be deleted by owner"
  on business_members for delete
  using (business_id in (select current_business_ids()));
```

---

### 3. ✅ Race condition: duplicate invoices possible
**Files:** `supabase/migrations/0003_invoices_job_unique.sql`, `lib/db/invoices.ts`  
**Fixed in:** commit `e183b5a` (migration) + `665f93c` (app layer)

Added `UNIQUE` constraint on `invoices.job_id` at the DB level. Also added a
`23505` (unique_violation) catch in `createInvoiceForJob` to gracefully handle
the race — returns the winning concurrent insert instead of throwing.

---

### 4. Race condition: duplicate invoice numbers possible
**File:** `lib/db/invoices.ts` lines 82–100  
**Status:** ⏳ Deferred — acceptable for single-user MVP

`nextInvoiceNumber()` reads the latest invoice then increments in application
code. Under concurrent load, two requests can read the same "latest" and
generate the **same `INV-XXXX` number**.

**Fix (future):** Replace with a `SECURITY DEFINER` Postgres function or sequence:
```sql
create or replace function next_invoice_number(p_business_id uuid)
returns text language plpgsql security definer as $$
declare v_next int;
begin
  select coalesce(max(
    (regexp_match(invoice_number, '\d+'))[1]::int), 0) + 1
  into v_next
  from invoices where business_id = p_business_id;
  return 'INV-' || lpad(v_next::text, 4, '0');
end;
$$;
```

---

### 5. `markInvoiceSent / Paid / Void` have no status guard (app layer)
**File:** `lib/db/invoices.ts` lines 138–175  
**Status:** ⏭️ Skipped — UI already shows/hides buttons based on current status

Any invoice can be transitioned to any status without checking the current
state. The UI prevents invalid transitions (e.g. `void → paid`) by only
rendering the relevant action buttons. A direct API call would still bypass this.

**Fix (future):**
```ts
const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'void'],
  sent:  ['paid', 'void'],
  paid:  [],   // terminal
  void:  [],   // terminal
};
```

---

## 🟠 DATA INTEGRITY — Fix soon

### 6. `vehicles.business_id` is denormalized and can drift
**File:** `0001_init.sql` line 116  
**Status:** 🟠 Not fixed

`vehicles.business_id` should always equal
`customers(customer_id).business_id`, but there is **no CHECK constraint or
trigger** enforcing this. A bug could insert a vehicle with a different
`business_id` than its customer. The result: the vehicle becomes invisible to
the business (RLS scope mismatch) but is still referenced by the customer.

Same problem applies to **`job_photos.business_id`**.

**Fix (future):** Add a trigger or generated column that derives `business_id` from
the customer.

---

### 7. ✅ `vehicles.plate` has no UNIQUE constraint
**File:** `supabase/migrations/0005_data_quality_constraints.sql`  
**Fixed in:** commit `e183b5a`

Replaced the non-unique `vehicles_plate_idx` with a partial unique index:
```sql
create unique index vehicles_plate_uk
  on vehicles (business_id, lower(plate))
  where plate is not null;
```
Case-insensitive match; `NULL` plates are excluded (a vehicle without a plate
is valid and should not conflict).

---

### 8. ✅ No CHECK on `scheduled_end > scheduled_start`
**File:** `supabase/migrations/0005_data_quality_constraints.sql`  
**Fixed in:** commit `e183b5a`

Added a CHECK constraint:
```sql
alter table jobs add constraint jobs_schedule_order_chk
  check (scheduled_end is null or scheduled_start is null
         or scheduled_end > scheduled_start);
```

---

### 9. ✅ `deleteCustomer` surfaces raw FK error to the user
**Files:** `lib/db/customers.ts`, `app/app/customers/[id]/_components/delete-customer-button.tsx`  
**Fixed in:** commit `503db08`

Added `23503` (foreign_key_violation) catch in `deleteCustomer` with a friendly
message: *"This customer has job history and cannot be deleted. Remove their jobs first."*

Created `DeleteCustomerButton` client component using `useActionState` to
display the error inline below the delete button — no more crash or raw 500.

---

### 9b. ✅ `deleteJob` surfaces raw FK error when job has an invoice
**Files:** `lib/db/jobs.ts`, `app/app/jobs/actions.ts`, `app/app/jobs/[id]/_components/delete-job-button.tsx`  
**Fixed in:** commit `142853d`

Same pattern as Issue #9. `invoices.job_id` is `ON DELETE RESTRICT` — deleting
a job with an invoice crashed the page. Added:
- `23503` catch in `deleteJob` → friendly message: *"This job has an invoice. Void or delete the invoice first."*
- `DeleteJobButton` component with inline error display.

> Note: `job_photos` already uses `ON DELETE CASCADE`, so photos are safely
> auto-deleted when their job is deleted. Only the invoice FK was the problem.

---

### 10. ✅ Date filters in `listJobs` hardcode UTC offset
**Files:** `lib/db/jobs.ts`, `app/app/jobs/page.tsx`  
**Fixed in:** commit `503db08`

The hardcoded `T00:00:00Z` / `T23:59:59Z` suffix missed Brisbane jobs in the
first 10 hours of the day (UTC+10). Fixed by passing `timezone` through
`ListJobsFilters` and calling `dayRangeUtc(tz, date)` to convert local dates to
correct UTC boundaries before filtering.

---

## 🟡 MISSING FIELDS

### 11. ✅ `businesses` missing Australian legal requirements
**File:** `supabase/migrations/0004_businesses_contact_fields.sql`  
**Fixed in:** commit `503db08`

Added `abn`, `email`, `phone`, `address`, `logo_url` columns. Invoice detail
page (`app/app/invoices/[id]/page.tsx`) now renders these fields in the "From"
section.

| Field | Why it matters |
|---|---|
| `abn text` | ABN must appear on all tax invoices over $82.50 (ATO requirement) |
| `email text` | Invoice "from" address |
| `phone text` | Contact on invoice |
| `address text` | Business address on invoice |
| `logo_url text` | Already rendered in sidebar — now stored in DB |

---

### 12. ✅ `invoices` missing GST breakdown (partial fix)
**File:** `supabase/migrations/0006_invoices_gst.sql`  
**Fixed in:** commit `665f93c`

Added `subtotal` (pre-GST amount) and `gst_amount` (10% GST) columns.
`createInvoiceForJob` now calculates them from `job.price`. Invoice page now
shows Subtotal / GST (10%) / Total (inc. GST) line items.

Existing rows back-filled: `subtotal = round(amount / 1.1, 2)`.

**Still missing:** `due_date date`, `notes text` — deferred to next iteration.

---

### 13. `services` is missing `duration_minutes`
**Status:** 🟡 Not fixed

Without a duration, the app cannot auto-calculate `scheduled_end` or prevent
double-booking.

```sql
alter table services add column duration_minutes int not null default 60;
```

---

### 14. `jobs` is missing `completed_at`
**Status:** 🟡 Not fixed

Only `updated_at` changes when a job is completed — unreliable for reporting
average job duration.

```sql
alter table jobs add column completed_at timestamptz;
```

---

### 15. `jobs` has no `cancellation_reason`
**Status:** 🟡 Not fixed

```sql
alter table jobs add column cancellation_reason text;
```

---

## 🔵 FUTURE SAAS RISKS

### 16. No soft delete on any table
All deletes are permanent. No `deleted_at` column anywhere.
A misclick deletes a customer forever; no undo, no accounting audit trail.

**Future migration pattern:**
```sql
alter table customers add column deleted_at timestamptz;
-- Update RLS: and deleted_at is null
-- Update queries: .is("deleted_at", null)
```

---

### 17. `job_status` and `invoice_status` are Postgres enums
Adding a new value requires `ALTER TYPE ... ADD VALUE`, which **cannot run
inside a transaction** — making rollback impossible if a migration fails.

**Alternative:** `text` with a `CHECK` constraint — easier to migrate, same validation.

---

### 18. `business_members.role` is not enforced by RLS
All operational table policies use `FOR ALL` — a `staff` member has the same
access as the `owner`. The `role` column is stored but never checked.

---

### 19. Service pricing model doesn't scale
The seed encodes vehicle size as a name suffix (e.g. `"Basic Wash — SUV"`).
No concept of pricing tiers, add-ons, or service packages.

---

### 20. No audit log
No record of who changed invoice status, who deleted a customer, or when a
job price was last changed.

```sql
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null, -- INSERT, UPDATE, DELETE
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
```

---

## Summary table

| # | Severity | Issue | Status |
|---|---|---|---|
| 1 | 🔴 Critical | No INSERT RLS on `businesses` | ⏭️ Skipped (single-user MVP) |
| 2 | 🔴 Critical | No INSERT/UPDATE/DELETE RLS on `business_members` | ⏭️ Skipped (single-user MVP) |
| 3 | 🔴 Critical | Duplicate invoice race condition | ✅ Fixed — `0003` migration + app layer |
| 4 | 🔴 Critical | Invoice number race condition in app code | ⏳ Deferred |
| 5 | 🔴 Critical | Invoice status transitions not guarded | ⏭️ Skipped (UI guards transitions) |
| 6 | 🟠 Important | Denormalized `business_id` can drift on vehicles & photos | 🟠 Not fixed |
| 7 | 🟠 Important | `vehicles.plate` not unique | ✅ Fixed — `0005` migration |
| 8 | 🟠 Important | No CHECK on `scheduled_end > scheduled_start` | ✅ Fixed — `0005` migration |
| 9 | 🟠 Important | `deleteCustomer` surfaces raw FK error | ✅ Fixed — `DeleteCustomerButton` |
| 9b | 🟠 Important | `deleteJob` crashes when job has an invoice | ✅ Fixed — `DeleteJobButton` |
| 10 | 🟠 Important | Date filters ignore business timezone | ✅ Fixed — `dayRangeUtc()` |
| 11 | 🟡 Missing | `businesses` missing ABN, email, phone, address, logo | ✅ Fixed — `0004` migration |
| 12 | 🟡 Missing | `invoices` missing GST breakdown | ✅ Partial — `0006` migration (due_date/notes deferred) |
| 13 | 🟡 Missing | `services` missing `duration_minutes` | 🟡 Not fixed |
| 14 | 🟡 Missing | `jobs` missing `completed_at` | 🟡 Not fixed |
| 15 | 🟡 Missing | `jobs` missing `cancellation_reason` | 🟡 Not fixed |
| 16 | 🔵 Future | No soft delete anywhere | 🔵 Future |
| 17 | 🔵 Future | Enum types are hard to migrate | 🔵 Future |
| 18 | 🔵 Future | `role` not enforced by RLS | 🔵 Future |
| 19 | 🔵 Future | Service pricing model doesn't scale | 🔵 Future |
| 20 | 🔵 Future | No audit log | 🔵 Future |
