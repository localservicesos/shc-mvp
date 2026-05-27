-- Enforce one invoice per job at the database level.
--
-- Previously the app relied on an application-level check (getInvoiceByJob)
-- to prevent duplicates, but that has a race condition: two simultaneous
-- requests can both pass the check before either inserts a row.
--
-- Adding a UNIQUE constraint on job_id makes the second insert physically
-- impossible — Postgres rejects it with error code 23505 regardless of
-- how many concurrent requests are in flight.

alter table invoices
  add constraint invoices_job_id_uk unique (job_id);
