-- Storage bucket + policies for job photos.
--
-- Bucket is private. Files are served via short-lived signed URLs that
-- the app generates server-side. Layout convention is:
--
--   job-photos/<business_id>/<job_id>/<uuid>.<ext>
--
-- The first path segment is the business id, which lets RLS policies
-- scope access to members of that business.

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'job-photos',
  'job-photos',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects has RLS enabled by Supabase. Add policies scoped to
-- business membership.

drop policy if exists "Job photos visible to business members"   on storage.objects;
drop policy if exists "Job photos insertable by business members" on storage.objects;
drop policy if exists "Job photos deletable by business members"  on storage.objects;

create policy "Job photos visible to business members"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] in (
      select business_id::text from business_members where user_id = auth.uid()
    )
  );

create policy "Job photos insertable by business members"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] in (
      select business_id::text from business_members where user_id = auth.uid()
    )
  );

create policy "Job photos deletable by business members"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] in (
      select business_id::text from business_members where user_id = auth.uid()
    )
  );
