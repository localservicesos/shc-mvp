-- Composite indexes for the hottest read paths.
--
-- Dashboard buckets and the filtered Jobs list query by status AND a
-- scheduled_start range (with an ORDER BY scheduled_start) within a business.
-- The existing single-purpose indexes — (business_id, status) and
-- (business_id, scheduled_start) — force the planner to pick one and filter
-- the rest; this composite covers filter + range + sort in one scan.
create index if not exists jobs_status_scheduled_start_idx
  on jobs (business_id, status, scheduled_start);

-- The paginated invoice list orders by created_at desc; invoices previously
-- had no index covering that ordering.
create index if not exists invoices_created_at_idx
  on invoices (business_id, created_at desc);
