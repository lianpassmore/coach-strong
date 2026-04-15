-- Core profile columns used by the dashboard, onboarding, and settings pages.
-- Uses "if not exists" so this is safe to run against an existing profiles table.

alter table profiles
  add column if not exists full_name        text,
  add column if not exists goal             text,
  add column if not exists motivation_word  text,
  add column if not exists current_week     integer     not null default 1 check (current_week between 1 and 8),
  add column if not exists cohort           text,
  add column if not exists program_phase    text,
  add column if not exists total_sessions   integer     not null default 0,
  add column if not exists last_active_at   timestamptz,
  add column if not exists updated_at       timestamptz not null default now();
