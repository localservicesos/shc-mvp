-- Allocate the next invoice number for a business inside Postgres.
--
-- Replaces the app-side approach that downloaded EVERY invoice_number for the
-- business and computed the max in JS (once per retry attempt). This computes
-- the max where the data lives and returns a single text value.
--
-- The transaction-scoped advisory lock serialises concurrent allocations for
-- the same business, so two requests can no longer read the same max — which
-- also makes the app-side 23505 retry loop a near-dead code path.
--
-- SECURITY INVOKER (default): the caller's RLS policies still apply, so a
-- member can only ever see (and number against) their own business's invoices.

create or replace function next_invoice_number(p_business_id uuid)
returns text
language plpgsql
as $$
declare
  v_max int;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('invoice_number:' || p_business_id::text, 0)
  );

  select coalesce(max((regexp_match(invoice_number, '(\d+)'))[1]::int), 0)
    into v_max
  from invoices
  where business_id = p_business_id;

  return 'INV-' || lpad((v_max + 1)::text, 4, '0');
end;
$$;
