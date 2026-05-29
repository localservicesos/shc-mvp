-- Reduce job_status enum to 3 values: booked, completed, cancelled.
-- Must drop the column default before dropping the enum type,
-- because the default expression depends on the type.

-- 1. Drop the default (we'll restore it at the end)
alter table jobs
  alter column status drop default;

-- 2. Convert to plain text so the enum can be dropped
alter table jobs
  alter column status type text;

-- 3. Drop and recreate the enum with 3 values
drop type job_status;

create type job_status as enum ('booked', 'completed', 'cancelled');

-- 4. Migrate any rows that had in_progress or ready -> booked (still active)
update jobs
  set status = 'booked'
  where status in ('in_progress', 'ready');

-- 5. Restore column type and default
alter table jobs
  alter column status type job_status using status::job_status;

alter table jobs
  alter column status set default 'booked';
