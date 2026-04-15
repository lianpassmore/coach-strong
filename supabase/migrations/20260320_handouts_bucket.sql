-- Storage bucket for weekly program handouts (PDFs uploaded by Eske).
-- Files are stored as handouts/week-{n}.pdf
-- Authenticated participants can download; only admins can upload/delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'handouts',
  'handouts',
  false,
  20971520,  -- 20 MB
  array['application/pdf']
)
on conflict (id) do update
  set file_size_limit    = 20971520,
      allowed_mime_types = array['application/pdf'];

-- Admins can upload and delete
create policy "Admins upload handouts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'handouts'
    and public.is_current_user_admin()
  );

create policy "Admins delete handouts"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'handouts'
    and public.is_current_user_admin()
  );

create policy "Admins update handouts"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'handouts'
    and public.is_current_user_admin()
  );

-- Authenticated participants can download any handout
create policy "Participants download handouts"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'handouts');
