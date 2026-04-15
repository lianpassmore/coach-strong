-- End-of-week reflections per participant per week
create table if not exists weekly_reflections (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references profiles(id) on delete cascade,
  week           integer     not null check (week between 1 and 8),
  went_well      text        not null default '',
  challenging    text        not null default '',
  do_differently text        not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, week)
);

alter table weekly_reflections enable row level security;

create policy "Users manage own weekly_reflections"
  on weekly_reflections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all weekly_reflections"
  on weekly_reflections for select
  using (public.is_current_user_admin());
