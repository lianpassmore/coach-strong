-- Track when each participant started the 8-week program.
-- Used to auto-advance current_week based on elapsed calendar days.

alter table profiles
  add column if not exists program_start_date date;
