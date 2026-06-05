-- Track invoice emails sent through transactional email providers.
--
-- Keeping this separate from invoices preserves resend history without
-- overwriting the invoice's current status fields.

create table invoice_emails (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  invoice_id          uuid not null references invoices(id) on delete cascade,
  to_email            text not null,
  subject             text not null,
  provider            text not null default 'resend',
  provider_message_id text,
  status              text not null default 'sent',
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index invoice_emails_business_idx
  on invoice_emails (business_id, created_at desc);

create index invoice_emails_invoice_idx
  on invoice_emails (invoice_id, created_at desc);

alter table invoice_emails enable row level security;

create policy "invoice_emails scoped to business"
  on invoice_emails for all
  using (business_id in (select current_business_ids()))
  with check (business_id in (select current_business_ids()));
