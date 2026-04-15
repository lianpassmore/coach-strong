-- Week-ahead planner: participants map each day to an activity type
create table if not exists weekly_plan (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  week       integer     not null check (week between 1 and 8),
  -- plan shape: { "mon": "training"|"meal_prep"|"rest"|"busy"|null, ... }
  plan       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week)
);

alter table weekly_plan enable row level security;

create policy "Users manage own weekly_plan"
  on weekly_plan for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all weekly_plan"
  on weekly_plan for select
  using (public.is_current_user_admin());
