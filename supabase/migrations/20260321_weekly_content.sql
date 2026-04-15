-- Weekly content: per-cohort zoom and replay links for each week.
-- The handouts bucket handles PDFs; this table handles the session links.

create table if not exists weekly_content (
  id          uuid        primary key default gen_random_uuid(),
  cohort_id   uuid        not null references cohorts(id) on delete cascade,
  week_number integer     not null check (week_number between 1 and 8),
  zoom_link   text,
  replay_link text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cohort_id, week_number)
);

alter table weekly_content enable row level security;

-- Admins manage all weekly content
drop policy if exists "Admins manage weekly content" on weekly_content;
create policy "Admins manage weekly content"
  on weekly_content for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- Participants can read weekly content for their cohort
drop policy if exists "Participants read weekly content" on weekly_content;
create policy "Participants read weekly content"
  on weekly_content for select
  using (
    auth.role() = 'authenticated'
    and cohort_id in (
      select c.id from cohorts c
      inner join profiles p on p.cohort = c.name
      where p.id = auth.uid()
    )
  );

-- Also add whatsapp_link to cohorts table for the cohort-level group link
alter table cohorts add column if not exists whatsapp_link text;
