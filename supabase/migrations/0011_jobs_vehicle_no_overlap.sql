-- Prevent double-booking the same vehicle.
--
-- Business rule: two different cars MAY share a time slot (the detailer can
-- juggle several jobs at once), but a SINGLE car cannot be booked for two
-- overlapping times — it can't be in two places at once.
--
-- This is the database-level backstop. The server actions (createJob/updateJob)
-- already reject conflicts with a friendly message and also cover the partial
-- cases (e.g. no end time set). This constraint guarantees the rule holds even
-- if that application check is ever bypassed.
--
-- Scope:
--   * Only "booked" jobs reserve a slot — cancelled/completed jobs are ignored.
--   * Only rows with BOTH scheduled_start and scheduled_end participate, so a
--     valid half-open range [start, end) can be built. (jobs_schedule_order_chk
--     already guarantees end > start when both are present.)
--   * Half-open ranges mean back-to-back bookings (one ending exactly when the
--     next begins) do NOT conflict.

-- btree_gist lets a GiST exclusion constraint combine an equality test
-- (vehicle_id) with a range-overlap test (&&) in the same index.
create extension if not exists btree_gist;

alter table jobs
  add constraint jobs_vehicle_no_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(scheduled_start, scheduled_end, '[)') with &&
  )
  where (
    vehicle_id is not null
    and scheduled_start is not null
    and scheduled_end is not null
    and status = 'booked'
  );
