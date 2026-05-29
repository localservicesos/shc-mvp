-- Add optional cancellation_reason to jobs.
-- Populated only when a job is cancelled via the confirmation dialog.

alter table jobs
  add column cancellation_reason text;
