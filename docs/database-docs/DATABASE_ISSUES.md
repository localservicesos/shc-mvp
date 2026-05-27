# Database Schema — Issues & Future Risks

> Full audit of `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, and
> the application DB layer in `lib/db/`. Issues are grouped by severity.

---

## 🔴 CRITICAL — Fix before going live

### 1. No INSERT policy on `businesses` (RLS gap)
**File:** `0001_init.sql` lines 247–254

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

### 3. Race condition: duplicate invoices possible
**Files:** `0001_init.sql`, `lib/db/invoices.ts` lines 108–110

The app guards against double-invoicing with an app-level check:
```ts
const existing = await getInvoiceByJob(jobId);
if (existing) return existing;
```
But **two simultaneous requests** can both pass this check before either
inserts a row, producing two invoices for the same job. The DB has no
`UNIQUE` constraint on `invoices.job_id`.

**Fix:** Add a unique constraint at the DB level:
```sql
alter table invoices add constraint invoices_job_id_uk unique (job_id);
```
This turns the race into a safe DB error instead of silent duplicate data.

---

### 4. Race condition: duplicate invoice numbers possible
**File:** `lib/db/invoices.ts` lines 82–100

`nextInvoiceNumber()` reads the latest invoice then increments in application
code. Under concurrent load, two requests can read the same "latest" and
generate the **same `INV-XXXX` number**. The unique constraint on
`(business_id, invoice_number)` will catch it as a DB error — but the user
gets a raw 500 instead of a graceful retry.

**Fix (MVP):** Add a DB-level sequence or a `SECURITY DEFINER` function so the
number is generated atomically:
```sql
create sequence invoice_number_seq start 1;

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

Any invoice can be transitioned to any status without checking the current
state. This allows:
- `void → paid` (legally problematic)
- `draft → paid` (skipping `sent`)
- `paid → sent` (reverting a completed payment)

**Fix:** Add a status transition check:
```ts
// Before updating, verify the transition is valid:
const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'void'],
  sent:  ['paid', 'void'],
  paid:  [],          // terminal — no transitions out
  void:  [],          // terminal — no transitions out
};
```

---

## 🟠 DATA INTEGRITY — Fix soon

### 6. `vehicles.business_id` is denormalized and can drift
**File:** `0001_init.sql` line 116

`vehicles.business_id` should always equal
`customers(customer_id).business_id`, but there is **no CHECK constraint or
trigger** enforcing this. A bug could insert a vehicle with a different
`business_id` than its customer. The result: the vehicle becomes invisible to
the business (RLS scope mismatch) but is still referenced by the customer.

**Fix:** Add a trigger or generated column that derives `business_id` from the
customer, or at minimum add a CHECK constraint via a function.

Same problem applies to **`job_photos.business_id`** (should always equal
`jobs(job_id).business_id`).

---

### 7. `vehicles.plate` has no UNIQUE constraint
**File:** `0001_init.sql` line 130

There is a regular index on `(business_id, plate)` — but it is **not unique**.
Two vehicles with the same plate can exist in the same business, which would
cause confusion and incorrect lookups.

**Fix:**
```sql
-- Replace the existing index with a partial unique index:
drop index vehicles_plate_idx;
create unique index vehicles_plate_uk
  on vehicles (business_id, lower(plate))
  where plate is not null;
```

---

### 8. No CHECK on `scheduled_end > scheduled_start`
**File:** `0001_init.sql` lines 162–175

A job can be inserted where `scheduled_end` is earlier than `scheduled_start`.
The DB will happily store it.

**Fix:**
```sql
alter table jobs add constraint jobs_schedule_order_chk
  check (scheduled_end is null or scheduled_start is null
         or scheduled_end > scheduled_start);
```

---

### 9. `deleteCustomer` will surface a raw Postgres error to the user
**File:** `lib/db/customers.ts` line 91–95

`jobs.customer_id` is `ON DELETE RESTRICT`. If a customer has any job history
and the user tries to delete them, the DB throws a foreign key violation.
This error propagates as an unhandled exception to the UI.

**Fix:** Catch the FK violation in `deleteCustomer` and return a typed error:
```ts
export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error?.code === "23503") {
    return { error: "Cannot delete a customer who has job history." };
  }
  if (error) throw error;
  return {};
}
```

---

### 10. Date filters in `listJobs` hardcode UTC offset
**File:** `lib/db/jobs.ts` lines 43–46

```ts
query = query.gte("scheduled_start", `${filters.from}T00:00:00Z`);
query = query.lte("scheduled_start", `${filters.to}T23:59:59Z`);
```

The business timezone is `Australia/Brisbane` (UTC+10, no DST). A job
scheduled at 08:00 Brisbane time is stored as `2024-01-01T22:00:00Z` (previous
UTC day). Filtering "today" from the Brisbane UI using `T00:00:00Z` will
**miss jobs in the first 10 hours of the Brisbane day**.

**Fix:** Convert the local date to UTC using the business timezone before
filtering, or filter using the business's UTC offset.

---

## 🟡 MISSING FIELDS

### 11. `businesses` is missing Australian legal requirements
Australian tax law (ATO) requires the following on every tax invoice:

| Missing field | Why it matters |
|---|---|
| `abn text` | ABN must appear on all tax invoices over $82.50 |
| `email text` | Invoice "from" address |
| `phone text` | Contact on invoice |
| `address text` | Business address on invoice |
| `logo_url text` | Already rendered in the sidebar — but not stored in DB |

```sql
alter table businesses
  add column abn      text,
  add column email    text,
  add column phone    text,
  add column address  text,
  add column logo_url text;
```

---

### 12. `invoices` is missing GST and standard invoice fields
Australian GST (10%) is legally required on invoices for GST-registered
businesses. The current schema has a flat `amount` with no breakdown.

| Missing field | Why it matters |
|---|---|
| `subtotal numeric(10,2)` | Pre-GST amount |
| `gst_amount numeric(10,2)` | 10% GST — legally required |
| `due_date date` | Standard on invoices; needed for payment terms |
| `notes text` | Terms, bank details, thank-you message |

---

### 13. `services` is missing `duration_minutes`
Without a duration, the app cannot:
- Auto-calculate `scheduled_end` from `scheduled_start` when creating a job.
- Prevent double-booking on the same time slot.
- Show accurate blocks on a future calendar view.

```sql
alter table services add column duration_minutes int not null default 60;
```

---

### 14. `jobs` is missing `completed_at`
When a job transitions to `completed`, only `updated_at` changes — which also
changes on any edit. There is no dedicated timestamp for when the job was
actually finished. This makes reporting ("how long do jobs take on average?")
unreliable.

```sql
alter table jobs add column completed_at timestamptz;
```

---

### 15. `jobs` has no `cancellation_reason`
When a job is cancelled, there is no field to record why. This is useful for
spotting patterns (e.g. customer no-shows, weather).

```sql
alter table jobs add column cancellation_reason text;
```

---

## 🔵 FUTURE SAAS RISKS

### 16. No soft delete on any table
All deletes are permanent (`CASCADE` or `RESTRICT`). There is no `deleted_at`
column anywhere. Consequences:
- A misclick deletes a customer forever.
- No "trash / undo" UX is possible.
- Audit trails for accounting are impossible.

**Future migration pattern:**
```sql
alter table customers add column deleted_at timestamptz;
-- Update RLS to add: and deleted_at is null
-- Update queries to filter: .is("deleted_at", null)
```

---

### 17. `job_status` and `invoice_status` are Postgres enums
Adding a new value to a Postgres enum (e.g. `on_hold`) requires:
```sql
ALTER TYPE job_status ADD VALUE 'on_hold';
```
This **cannot be run inside a transaction**, making it risky in a migration
pipeline. If the migration fails partway through, rollback is not possible.

**Alternative:** Use `text` with a `CHECK` constraint — easier to migrate,
same validation:
```sql
status text not null default 'booked'
  check (status in ('booked','in_progress','ready','completed','cancelled'))
```

---

### 18. `business_members.role` is not enforced by RLS
All operational table policies use a single `FOR ALL` policy — meaning a
`staff` member has the **same read/write access as the `owner`**. The `role`
column is stored but never checked.

When staff permissions matter (e.g. staff can't void invoices or delete
customers), the policies will need to be split into per-action policies:
```sql
-- Example future pattern:
create policy "only owners can delete customers"
  on customers for delete
  using (
    exists (
      select 1 from business_members
      where user_id = auth.uid()
        and business_id = customers.business_id
        and role = 'owner'
    )
  );
```

---

### 19. Service pricing model doesn't scale
The seed encodes vehicle size as a name suffix (e.g. `"Basic Wash — SUV"`).
With 17 rows for one business, this will grow unwieldy. There is no concept of:
- Pricing tiers per vehicle category
- Add-on services linked to a base service
- Service packages

This is an MVP trade-off — but the `services` table will need a `category`
or `parent_id` column before adding a second service-type business.

---

### 20. No audit log
For a business handling invoices and payments, there is no record of:
- Who changed invoice status from `sent` to `paid`
- Who deleted a customer
- When a job price was last changed

**Future table:**
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

| # | Severity | Issue | Effort |
|---|---|---|---|
| 1 | 🔴 Critical | No INSERT RLS on `businesses` | XS |
| 2 | 🔴 Critical | No INSERT/UPDATE/DELETE RLS on `business_members` | XS |
| 3 | 🔴 Critical | Duplicate invoice race condition (no DB unique on `job_id`) | XS |
| 4 | 🔴 Critical | Invoice number race condition in app code | S |
| 5 | 🔴 Critical | Invoice status transitions not guarded | S |
| 6 | 🟠 Important | Denormalized `business_id` can drift on vehicles & photos | M |
| 7 | 🟠 Important | `vehicles.plate` not unique | XS |
| 8 | 🟠 Important | No CHECK on `scheduled_end > scheduled_start` | XS |
| 9 | 🟠 Important | `deleteCustomer` surfaces raw FK error | XS |
| 10 | 🟠 Important | Date filters ignore business timezone | S |
| 11 | 🟡 Missing | `businesses` missing ABN, email, phone, address, logo | S |
| 12 | 🟡 Missing | `invoices` missing GST, due date, notes | S |
| 13 | 🟡 Missing | `services` missing `duration_minutes` | XS |
| 14 | 🟡 Missing | `jobs` missing `completed_at` | XS |
| 15 | 🟡 Missing | `jobs` missing `cancellation_reason` | XS |
| 16 | 🔵 Future | No soft delete anywhere | L |
| 17 | 🔵 Future | Enum types are hard to migrate | M |
| 18 | 🔵 Future | `role` not enforced by RLS | M |
| 19 | 🔵 Future | Service pricing model doesn't scale | L |
| 20 | 🔵 Future | No audit log | L |
