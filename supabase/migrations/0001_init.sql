-- Initial schema for the local-service-os MVP.
--
-- Designed for the first client (Sunshine Hot Cars, a car detailing business) while
-- keeping a multi-tenant SaaS shape: every operational table carries
-- business_id and RLS scopes rows to the businesses the auth user
-- belongs to via business_members.

set search_path = public;

create extension if not exists "pgcrypto";

----------------------------------------------------------------------
-- Enums
----------------------------------------------------------------------

create type member_role as enum ('owner', 'staff');

create type job_status as enum (
  'booked',
  'in_progress',
  'ready',
  'completed',
  'cancelled'
);

create type invoice_status as enum ('draft', 'sent', 'paid', 'void');

create type job_photo_type as enum ('before', 'after', 'other');

----------------------------------------------------------------------
-- updated_at trigger helper
----------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

----------------------------------------------------------------------
-- businesses
----------------------------------------------------------------------

create table businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  timezone    text not null default 'Australia/Brisbane',
  currency    text not null default 'AUD',
  created_at  timestamptz not null default now()
);

----------------------------------------------------------------------
-- business_members  (links auth.users <-> businesses)
----------------------------------------------------------------------

create table business_members (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  business_id  uuid not null references businesses(id) on delete cascade,
  role         member_role not null default 'owner',
  created_at   timestamptz not null default now(),
  unique (user_id, business_id)
);

create index business_members_user_idx     on business_members (user_id);
create index business_members_business_idx on business_members (business_id);

-- Helper: businesses the current auth user belongs to.
-- security definer so RLS policies can use it without recursion.
create or replace function current_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from business_members
  where user_id = auth.uid();
$$;

----------------------------------------------------------------------
-- customers
----------------------------------------------------------------------

create table customers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  address      text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index customers_business_idx on customers (business_id);
create index customers_name_idx     on customers (business_id, lower(name));

create trigger customers_set_updated_at
before update on customers
for each row execute function set_updated_at();

----------------------------------------------------------------------
-- vehicles
----------------------------------------------------------------------

create table vehicles (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  make         text,
  model        text,
  year         int,
  color        text,
  plate        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index vehicles_business_idx on vehicles (business_id);
create index vehicles_customer_idx on vehicles (customer_id);
create index vehicles_plate_idx    on vehicles (business_id, plate);

create trigger vehicles_set_updated_at
before update on vehicles
for each row execute function set_updated_at();

----------------------------------------------------------------------
-- services
----------------------------------------------------------------------

create table services (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  description  text,
  base_price   numeric(10, 2) not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index services_business_idx on services (business_id);
create index services_active_idx   on services (business_id, active);

create trigger services_set_updated_at
before update on services
for each row execute function set_updated_at();

----------------------------------------------------------------------
-- jobs
----------------------------------------------------------------------

create table jobs (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete restrict,
  vehicle_id      uuid references vehicles(id) on delete set null,
  service_id      uuid references services(id) on delete set null,
  scheduled_start timestamptz,
  scheduled_end   timestamptz,
  status          job_status not null default 'booked',
  price           numeric(10, 2),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index jobs_business_idx        on jobs (business_id);
create index jobs_status_idx          on jobs (business_id, status);
create index jobs_scheduled_start_idx on jobs (business_id, scheduled_start);
create index jobs_customer_idx        on jobs (customer_id);
create index jobs_vehicle_idx         on jobs (vehicle_id);

create trigger jobs_set_updated_at
before update on jobs
for each row execute function set_updated_at();

----------------------------------------------------------------------
-- job_photos
----------------------------------------------------------------------

create table job_photos (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  photo_url    text not null,
  type         job_photo_type not null default 'other',
  caption      text,
  created_at   timestamptz not null default now()
);

create index job_photos_business_idx on job_photos (business_id);
create index job_photos_job_idx      on job_photos (job_id);

----------------------------------------------------------------------
-- invoices
----------------------------------------------------------------------

create table invoices (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  job_id          uuid not null references jobs(id) on delete restrict,
  invoice_number  text not null,
  amount          numeric(10, 2) not null default 0,
  status          invoice_status not null default 'draft',
  sent_at         timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create index invoices_business_idx on invoices (business_id);
create index invoices_job_idx      on invoices (job_id);
create index invoices_status_idx   on invoices (business_id, status);

create trigger invoices_set_updated_at
before update on invoices
for each row execute function set_updated_at();

----------------------------------------------------------------------
-- Row Level Security
--
-- Default deny-all. Every read/write is scoped to the businesses the
-- authenticated user is a member of via business_members.
----------------------------------------------------------------------

alter table businesses        enable row level security;
alter table business_members  enable row level security;
alter table customers         enable row level security;
alter table vehicles          enable row level security;
alter table services          enable row level security;
alter table jobs              enable row level security;
alter table job_photos        enable row level security;
alter table invoices          enable row level security;

-- businesses: members can see their own business
create policy "businesses are visible to members"
  on businesses for select
  using (id in (select current_business_ids()));

create policy "businesses can be updated by members"
  on businesses for update
  using (id in (select current_business_ids()))
  with check (id in (select current_business_ids()));

-- business_members: a user can see their own memberships
create policy "members see their memberships"
  on business_members for select
  using (user_id = auth.uid());

-- Operational tables — same shape policy.
-- Using a single FOR ALL policy keeps things readable for the MVP;
-- split into per-action policies later if/when staff roles diverge.

create policy "customers scoped to business"
  on customers for all
  using (business_id in (select current_business_ids()))
  with check (business_id in (select current_business_ids()));

create policy "vehicles scoped to business"
  on vehicles for all
  using (business_id in (select current_business_ids()))
  with check (business_id in (select current_business_ids()));

create policy "services scoped to business"
  on services for all
  using (business_id in (select current_business_ids()))
  with check (business_id in (select current_business_ids()));

create policy "jobs scoped to business"
  on jobs for all
  using (business_id in (select current_business_ids()))
  with check (business_id in (select current_business_ids()));

create policy "job_photos scoped to business"
  on job_photos for all
  using (business_id in (select current_business_ids()))
  with check (business_id in (select current_business_ids()));

create policy "invoices scoped to business"
  on invoices for all
  using (business_id in (select current_business_ids()))
  with check (business_id in (select current_business_ids()));
