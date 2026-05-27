-- Add contact and legal fields to businesses.
--
-- These fields are required for legally valid Australian tax invoices:
--   - abn:     Australian Business Number (required on invoices over $82.50)
--   - email:   Business contact email shown on invoice
--   - phone:   Business contact phone shown on invoice
--   - address: Business address shown on invoice
--   - logo_url: Used in the sidebar and invoice header
--
-- All columns are nullable so existing rows are unaffected. Raphael
-- can fill them in via a future Settings page.

alter table businesses
  add column if not exists abn       text,
  add column if not exists email     text,
  add column if not exists phone     text,
  add column if not exists address   text,
  add column if not exists logo_url  text;
