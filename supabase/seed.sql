-- Idempotent seed for the dev environment.
--
-- Pre-requisite: an auth user must already exist for the email used below.
-- Create one via Dashboard → Authentication → Users → Add user (toggle
-- "Auto Confirm User") before running this script.
--
-- Replace OWNER_EMAIL with the email of the auth user that should own the
-- first business. For the dev project this is your own email.

\set owner_email 'rafaelfelic@gmail.com'

-- 1. The first business (Raphael's car detailing).
insert into businesses (name, slug, timezone, currency)
values ('Sunshine Hot Cars', 'sunshine-hot-cars', 'Australia/Brisbane', 'AUD')
on conflict (slug) do nothing;

-- 2. Link the auth user as the business owner.
insert into business_members (user_id, business_id, role)
select u.id, b.id, 'owner'
from auth.users  u
join businesses  b on b.slug = 'sunshine-hot-cars'
where u.email = :'owner_email'
on conflict (user_id, business_id) do nothing;

-- 3. A starter service catalog Raphael can edit later.
insert into services (business_id, name, description, base_price, active)
select b.id, s.name, s.description, s.base_price, true
from businesses b
cross join (values
  ('Express Wash',     'Quick exterior wash and dry.',                          45.00),
  ('Standard Detail',  'Exterior wash + interior vacuum and wipe-down.',        120.00),
  ('Premium Detail',   'Standard detail plus clay bar, polish, and interior shampoo.', 220.00),
  ('Headlight Restore','Restore clouded headlights to clear.',                  60.00)
) as s(name, description, base_price)
where b.slug = 'sunshine-hot-cars'
  and not exists (
    select 1 from services where business_id = b.id and name = s.name
  );
