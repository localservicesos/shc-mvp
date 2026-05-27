-- Add GST breakdown to invoices.
--
-- Australian law requires GST-registered businesses to show the GST
-- component separately on tax invoices (currently 10%).
--
-- We split the flat `amount` into:
--   subtotal  — the pre-GST amount
--   gst_amount — 10% of subtotal
--   amount    — kept as the grand total (subtotal + gst_amount) for
--               backwards compatibility with existing queries.
--
-- Both new columns default to 0 so existing draft invoices remain valid.
-- The application recalculates them on every new invoice creation.

alter table invoices
  add column if not exists subtotal   numeric(10, 2) not null default 0,
  add column if not exists gst_amount numeric(10, 2) not null default 0;

-- Back-fill existing rows: treat their `amount` as the grand total and
-- derive subtotal / gst_amount assuming 10% GST inclusive pricing.
update invoices
set
  subtotal   = round(amount / 1.1, 2),
  gst_amount = round(amount - (amount / 1.1), 2)
where amount > 0;
