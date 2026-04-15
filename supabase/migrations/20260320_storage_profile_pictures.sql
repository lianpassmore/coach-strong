-- Create public storage bucket for profile pictures
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile_pictures',
  'profile_pictures',
  true,
  2097152,  -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Users can upload/update their own avatar
create policy "Users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile_pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile_pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile_pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is public, but explicit policy for safety)
create policy "Public read profile pictures"
  on storage.objects for select
  to public
  using (bucket_id = 'profile_pictures');
