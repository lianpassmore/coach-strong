-- Per-participant weekly coaching cap (minutes). Defaults to 120 (2 hours).
-- Admins can override this per participant via the admin dashboard.
alter table profiles
  add column if not exists weekly_cap_minutes integer not null default 120;
