# seed-test.sql — Test Data Guide

Use this to load realistic mock data into your deployed Supabase project so you can test the UI without manually creating records.

---

## What it creates

| Table     | Rows (approx) | Notes |
|-----------|--------------|-------|
| customers | 200          | Realistic Australian names, phones, emails, Brisbane suburbs |
| vehicles  | ~400         | 1–3 vehicles per customer, real makes/models/years/plates |
| jobs      | ~1,000       | 3–7 jobs per customer, all statuses, spread across past 90 days and next 14 days |
| invoices  | ~600         | Created for every `completed` and `ready` job; statuses: paid, sent, draft |

All mock rows are tagged with `[mock]` in the `notes` field so they can be deleted precisely without touching real data.

---

## Before you run

The business `sunshine-hot-cars` and its service catalog must already exist. If you have not run `seed.sql` yet, do that first.

---

## How to run

1. Open your [Supabase dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** → **New query**
4. Open `supabase/seed-test.sql` from this repo, copy the full contents
5. Paste into the SQL Editor
6. Click **Run**

The script takes 10–30 seconds. When complete you will see:

```
NOTICE: Mock data created: 200 customers, ~400 vehicles, ~1000 jobs, ~600 invoices.
```

---

## Safe to re-run

The script deletes all `[mock]` rows before inserting, so running it multiple times will not create duplicates. Use this to reset to a clean mock state at any time.

---

## What to test in the UI

### Dashboard
- Today's jobs section should show jobs with `in_progress` and `ready` status
- Upcoming jobs should show `booked` jobs in the next 14 days
- Counts across all status cards should reflect the loaded data

### Customers page
- 200 customers in the list
- Pagination and search should be exercisable
- Each customer has vehicles and job history

### Customer detail page
- Open any customer to see their vehicles (1–3) and past jobs
- Job history timeline covers the last 90 days

### Jobs page
- Filter by status: `booked`, `in_progress`, `ready`, `completed`, `cancelled`
- Filter by date range: try last 7 days, last 30 days, next 7 days
- Some jobs have discounts applied, some have extra charges

### Schedule page
- Daily and weekly views should show jobs spread across dates
- Future bookings exist for the next 14 days

### Invoice page
- Invoices in all four statuses: `draft`, `sent`, `paid`, `void` (void not seeded — create manually to test)
- Paid invoices have both `sent_at` and `paid_at` timestamps
- Sent invoices have `sent_at` but no `paid_at`
- Draft invoices have neither

---

## How to delete the mock data

Run this in the Supabase SQL Editor when you are done testing:

```sql
delete from invoices  where invoice_number like 'MOCK-%';
delete from jobs      where notes like '%[mock]%';
delete from vehicles  where notes like '%[mock]%';
delete from customers where notes like '%[mock]%';
```

Run statements in this order — invoices first, customers last — because of foreign key constraints.

To verify everything was removed:

```sql
select count(*) from customers where notes like '%[mock]%';
select count(*) from vehicles  where notes like '%[mock]%';
select count(*) from jobs      where notes like '%[mock]%';
select count(*) from invoices  where invoice_number like 'MOCK-%';
```

All four counts should return `0`.

---

## Troubleshooting

**"Business sunshine-hot-cars not found"**
Run `seed.sql` first to create the business and service catalog.

**"No services found"**
Same fix — run `seed.sql` first.

**SQL Editor timeout**
The script runs in a single transaction and typically completes in under 30 seconds. If it times out, try using the Supabase CLI with a direct database connection:
```bash
psql "$DATABASE_URL" -f supabase/seed-test.sql
```
Your `DATABASE_URL` is on the Supabase dashboard under **Settings → Database → Connection string**.
