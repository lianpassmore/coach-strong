-- Daily check-ins table
-- Stores one row per user per day: energy level (1-5) + assignment completion flag.
-- The progress page aggregates these into weekly averages for the chart.

create table if not exists check_ins (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references profiles(id) on delete cascade,
  checked_in_date      date        not null default current_date,
  week                 integer     not null check (week between 1 and 8),
  energy_level         integer     check (energy_level between 1 and 5),
  assignment_completed boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, checked_in_date)
);

-- RLS
alter table check_ins enable row level security;

drop policy if exists "Users read own check_ins"   on check_ins;
drop policy if exists "Users insert own check_ins" on check_ins;
drop policy if exists "Users update own check_ins" on check_ins;

create policy "Users read own check_ins"
  on check_ins for select
  using (auth.uid() = user_id);

create policy "Users insert own check_ins"
  on check_ins for insert
  with check (auth.uid() = user_id);

create policy "Users update own check_ins"
  on check_ins for update
  using (auth.uid() = user_id);
