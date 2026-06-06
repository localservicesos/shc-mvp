-- Create the Sunshine Hot Cars owner login.
--
-- ⚠️ Raw-SQL auth user creation is NOT the Supabase-recommended path. The
-- supported way is the Admin API (auth.admin.createUser). This script fills the
-- fields GoTrue requires at login time (aud, role, confirmed email, bcrypt
-- password, and a matching auth.identities row with provider_id). Tested
-- against this project's auth schema, but if login fails, fall back to the
-- Admin API.
--
-- Password is hashed with pgcrypto bcrypt. Change it after first login.
--
-- Run with:  bun scripts/run-sql.ts scripts/create-owner-user.sql
-- or paste into the Supabase SQL editor.

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email   text := 'info@sunshinehotcars.com';
  v_pass    text := 'shcadm123@';
begin
  -- Skip if the user already exists (idempotent).
  if exists (select 1 from auth.users where email = v_email) then
    raise notice 'User % already exists — skipping.', v_email;
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_pass, gen_salt('bf')),   -- bcrypt hash GoTrue expects
    now(),                            -- mark email confirmed so login works
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    '{}'::jsonb,
    false,
    false
  );

  -- The matching identity row. provider_id must equal the user id for the
  -- email provider, or GoTrue won't associate the login.
  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  raise notice 'Created user % with id %', v_email, v_user_id;
end $$;
