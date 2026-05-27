-- Data quality constraints.
--
-- 1. Unique licence plate per business.
--    The existing index was non-unique, allowing the same plate to be
--    registered twice in the same business. Replace it with a partial
--    unique index (partial so NULL plates are excluded — a vehicle
--    without a plate is valid and should not conflict with others).
--
-- 2. Job schedule sanity check.
--    Prevent scheduled_end from being set to a time before scheduled_start.
--    Both columns are nullable so the check only fires when both are present.

-- 1. Unique plate per business (case-insensitive, NULL excluded)
drop index if exists vehicles_plate_idx;
create unique index vehicles_plate_uk
  on vehicles (business_id, lower(plate))
  where plate is not null;

-- 2. scheduled_end must be after scheduled_start when both are set
alter table jobs
  add constraint jobs_schedule_order_chk
  check (
    scheduled_end is null
    or scheduled_start is null
    or scheduled_end > scheduled_start
  );
