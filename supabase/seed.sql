-- Idempotent seed for the dev environment.
--
-- Pre-requisite: an auth user with the email below must exist.
-- Create one via Dashboard → Authentication → Users → Add user (toggle
-- "Auto Confirm User") before running this script.
--
-- Change the email on the OWNER_EMAIL line below to whatever auth user
-- should own the first business.
--
-- Re-running this script is safe in dev: it deletes the existing services
-- for the business and re-inserts the canonical catalog (which is fine
-- because jobs reference services via ON DELETE SET NULL and snapshot
-- their own price). It does NOT touch customers, vehicles, jobs, or
-- invoices.

-- 1. The first business (Sunshine Hot Cars).
insert into businesses (name, slug, timezone, currency)
values ('Sunshine Hot Cars', 'sunshine-hot-cars', 'Australia/Brisbane', 'AUD')
on conflict (slug) do nothing;

-- 2. Link the business owners.
--    Both accounts get the 'owner' role so either can log in and manage the business.
--      localservicesops@gmail.com — main agency/admin account
--      info@sunshinehotcars.com   — business client account
--    Each auth user must exist in Dashboard → Authentication → Users before running this.
insert into business_members (user_id, business_id, role)
select u.id, b.id, 'owner'
from auth.users  u
join businesses  b on b.slug = 'sunshine-hot-cars'
where u.email in ('localservicesops@gmail.com', 'info@sunshinehotcars.com')
on conflict (user_id, business_id) do nothing;

-- 3. Service catalog matching sunshinehotcars.com/services-and-prices.
--    Tiered pricing (Hatch/Sedan vs SUV vs 4x4) is encoded as one row per
--    tier so the existing single-price schema can stay simple. The "From"
--    pricing for Exterior polish uses the published starting price.
delete from services
where business_id = (select id from businesses where slug = 'sunshine-hot-cars');

insert into services (business_id, name, description, base_price, active)
select b.id, s.name, s.description, s.base_price, true
from businesses b
cross join (values
  -- Basic wash
  ('Basic Wash — Hatch/Sedan',
   'Exterior hand wash, bug removal, wheel/tyre cleaning, interior vacuum, surface and window cleaning, rubbish removal, deodorizing.',
   100.00),
  ('Basic Wash — SUV',
   'Exterior hand wash, bug removal, wheel/tyre cleaning, interior vacuum, surface and window cleaning, rubbish removal, deodorizing.',
   130.00),
  ('Basic Wash — 4x4',
   'Exterior hand wash, bug removal, wheel/tyre cleaning, interior vacuum, surface and window cleaning, rubbish removal, deodorizing.',
   150.00),

  -- Mini detailing
  ('Mini Detailing — Hatch/Sedan',
   'Basic wash with premium products, snow foam pre-wash, paint sealant, steam cleaning, leather conditioning, exhaust cleaning, door jamb work.',
   350.00),
  ('Mini Detailing — SUV/4x4',
   'Basic wash with premium products, snow foam pre-wash, paint sealant, steam cleaning, leather conditioning, exhaust cleaning, door jamb work.',
   400.00),

  -- Full detailing
  ('Full Detailing — Hatch/Sedan',
   'Mini detailing plus textile extraction, interior dressing, engine bay detail, paint decontamination, exterior polish.',
   750.00),
  ('Full Detailing — SUV/4x4',
   'Mini detailing plus textile extraction, interior dressing, engine bay detail, paint decontamination, exterior polish.',
   800.00),

  -- Ceramic coat
  ('Ceramic Coat Package — Hatch/Sedan',
   'Basic wash plus Gtechniq Crystal Serum Light application (max 10k odometer).',
   1400.00),
  ('Ceramic Coat Package — SUV/4x4',
   'Basic wash plus Gtechniq Crystal Serum Light application (max 10k odometer).',
   1500.00),

  -- New car package
  ('New Car Package — Hatch/Sedan',
   'Ceramic coat package, fabric/leather protection, interior trim protection, windscreen coating. Optional stage 2 polish: +$300.',
   1850.00),
  ('New Car Package — SUV/4x4',
   'Ceramic coat package, fabric/leather protection, interior trim protection, windscreen coating. Optional stage 2 polish: +$300.',
   1950.00),

  -- Extras / add-ons
  ('Wheel face ceramic coat', 'Add-on ceramic protection for wheel faces.', 150.00),
  ('Leather protection',      'Add-on leather protection treatment.',       200.00),
  ('Window protection',       'Add-on hydrophobic window coating.',         200.00),
  ('Paint protection',        'Add-on paint sealant.',                      100.00),
  ('Head beam rejuvenation',  'Restore clouded headlights to clear.',       150.00),
  ('Exterior polish',         'Exterior cut and polish. Starts from $350; final price depends on condition.', 350.00)
) as s(name, description, base_price)
where b.slug = 'sunshine-hot-cars';
