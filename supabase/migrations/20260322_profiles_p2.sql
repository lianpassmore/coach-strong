-- P2 feature columns on profiles
alter table profiles
  add column if not exists disruption_mode        boolean not null default false,
  add column if not exists disruption_mode_until  date,
  add column if not exists cycle_tracking_enabled boolean not null default false,
  add column if not exists afternoon_nudge_enabled boolean not null default false;
