-- "What I now know" journal entries per participant per week
create table if not exists journal_entries (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  week       integer     not null check (week between 1 and 8),
  content    text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- no unique constraint — allow multiple entries per week
);

alter table journal_entries enable row level security;

create policy "Users manage own journal_entries"
  on journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all journal_entries"
  on journal_entries for select
  using (public.is_current_user_admin());
