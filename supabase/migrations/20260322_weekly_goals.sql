-- Weekly minimum and stretch goals per participant per week
create table if not exists weekly_goals (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  week       integer     not null check (week between 1 and 8),
  min_goal   text        not null default '',
  max_goal   text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week)
);

alter table weekly_goals enable row level security;

create policy "Users manage own weekly_goals"
  on weekly_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all weekly_goals"
  on weekly_goals for select
  using (public.is_current_user_admin());
