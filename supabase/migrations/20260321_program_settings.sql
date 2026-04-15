-- Singleton settings row for program-wide configuration
create table if not exists program_settings (
  id                          integer     primary key default 1 check (id = 1),
  no_activity_days            integer     not null default 5,
  low_energy_streak           integer     not null default 3,
  default_weekly_cap_minutes  integer     not null default 120,
  updated_at                  timestamptz not null default now()
);

-- Seed the default row
insert into program_settings (id) values (1) on conflict do nothing;
