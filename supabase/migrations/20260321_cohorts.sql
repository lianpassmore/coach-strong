-- Cohort dates configured by Eske in the admin dashboard.
-- At onboarding, participants are auto-assigned to the nearest upcoming cohort.

create table if not exists cohorts (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,          -- e.g. 'April 9th Kickoff'
  start_date date        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

alter table cohorts enable row level security;

-- Admins manage cohorts
drop policy if exists "Admins manage cohorts" on cohorts;
create policy "Admins manage cohorts"
  on cohorts for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- Authenticated users can read active cohorts (needed at onboarding time)
drop policy if exists "Authenticated users read active cohorts" on cohorts;
create policy "Authenticated users read active cohorts"
  on cohorts for select
  using (auth.role() = 'authenticated' and is_active = true);

-- Seed the two existing cohorts
insert into cohorts (name, start_date) values
  ('April 9th Kickoff', '2026-04-09'),
  ('May 14th Kickoff',  '2026-05-14')
on conflict (start_date) do nothing;
