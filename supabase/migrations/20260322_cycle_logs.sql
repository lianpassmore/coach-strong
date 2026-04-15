-- Cycle tracking: log the start of each period
create table if not exists cycle_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references profiles(id) on delete cascade,
  period_start date        not null,
  created_at   timestamptz not null default now()
);

alter table cycle_logs enable row level security;

create policy "Users manage own cycle_logs"
  on cycle_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
