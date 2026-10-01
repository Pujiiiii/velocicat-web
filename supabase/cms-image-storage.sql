-- Storage for CMS-managed images.
-- The bucket is public for frontend image rendering; only admin users can upload/update/delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-images',
  'cms-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload CMS images" on storage.objects;
drop policy if exists "Admins can update CMS images" on storage.objects;
drop policy if exists "Admins can delete CMS images" on storage.objects;

create policy "Admins can upload CMS images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cms-images'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

create policy "Admins can update CMS images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cms-images'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
)
with check (
  bucket_id = 'cms-images'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

create policy "Admins can delete CMS images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cms-images'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
);
