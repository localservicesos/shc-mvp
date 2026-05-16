# Database schema

Source of truth: `supabase/migrations/0001_init.sql`. This document explains the *shape* of the data and *why* the foundation is built this way.

## Design goals

1. **Multi-tenant from day one.** Every operational table carries `business_id` and is gated by RLS scoped to the businesses the authenticated user belongs to.
2. **Boring, predictable Postgres.** UUID primary keys (`gen_random_uuid()`), `timestamptz` for all dates, `numeric(10, 2)` for money, enum types for fixed vocabularies.
3. **Updated-at via trigger.** A shared `set_updated_at()` trigger function fires `before update` on tables that have `updated_at`. No application logic required.
4. **Cascade rules favour the operational truth.** Deleting a business removes its data. Deleting a customer cascades vehicles and photos but **restricts** jobs / invoices (you cannot delete a customer who has historical jobs — that data has accounting value).

## Tables

### `businesses`
The tenant. One row per business. Holds display name, slug, timezone (`Australia/Brisbane`), currency (`AUD`).

### `business_members`
Many-to-many join between `auth.users` and `businesses`. Carries a `role` (`owner` | `staff`). The MVP only uses `owner` but the column is in place so staff permissions can be layered on later without a migration.

A helper SQL function `current_business_ids()` returns the set of `business_id`s the calling auth user belongs to. RLS policies read from it.

### `customers`
Belong to a business. Free-form contact info (`phone`, `email`, `address`) and `notes`. Indexed by `(business_id, lower(name))` for fast name lookups.

### `vehicles`
Belong to a customer (and therefore a business). Make / model / year / color / plate / notes. Indexed by plate for quick "whose car is this" lookups.

### `services`
Catalog of offerings the business sells (e.g. *Premium Detail*). Carries `base_price` and an `active` flag so retired services stay in history without polluting pickers.

### `jobs`
Central operational record. Links `customer`, `vehicle`, `service` (vehicle and service are nullable so a job can exist before everything is assigned), with `scheduled_start`, `scheduled_end`, a `status` enum (`booked`, `in_progress`, `ready`, `completed`, `cancelled`), a `price` snapshot, and `notes`.

Indexes are tuned for the three queries the UI runs constantly: by business + status, by business + scheduled_start, by customer.

### `job_photos`
Files attached to a job, typed `before` / `after` / `other`. `photo_url` points to a Supabase Storage object. RLS keeps photos scoped to the business; the bucket policy will mirror this once the bucket is provisioned.

### `invoices`
Generated from a job. `invoice_number` is unique per business. `status` enum (`draft` → `sent` → `paid`, plus `void`). Timestamps capture when the invoice was sent and paid for reporting. The MVP does not integrate a payment gateway — `paid_at` is set manually when the owner marks an invoice paid.

## Enums

| Enum               | Values                                                  |
| ------------------ | ------------------------------------------------------- |
| `member_role`      | `owner`, `staff`                                        |
| `job_status`       | `booked`, `in_progress`, `ready`, `completed`, `cancelled` |
| `invoice_status`   | `draft`, `sent`, `paid`, `void`                         |
| `job_photo_type`   | `before`, `after`, `other`                              |

## Row Level Security

- RLS is enabled on every operational table.
- The policy shape is uniform: rows are visible / writable iff `business_id in (select current_business_ids())`.
- `business_members` has its own narrower policy: each user only sees their own memberships.
- `businesses` is visible to members and updatable by members.

The MVP uses a single `FOR ALL` policy per operational table for simplicity. When staff roles diverge from owner roles, these can be split into per-action policies (`for select`, `for insert`, `for update`, `for delete`).

## Relationships at a glance

```
auth.users ─┐
            │
            ▼
   business_members ──▶ businesses ─┐
                                    │
   ┌────────────────────────────────┼───────────────────┐
   ▼                ▼               ▼                   ▼
customers ───▶ vehicles        services             invoices
   │              ▲                ▲                   ▲
   └────▶ jobs ───┘                │                   │
            │ └──────────▶ (service_id, optional)      │
            └─────▶ job_photos                         │
            └─────────────────────────────────────────▶┘
                                  (one invoice per job)
```
