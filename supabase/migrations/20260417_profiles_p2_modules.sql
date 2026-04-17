-- P2 module toggle columns on profiles (week planner + optional daily modules)
alter table profiles
  add column if not exists show_week_planner          boolean not null default false,
  add column if not exists module_morning_intention   boolean not null default false,
  add column if not exists module_evening_prep        boolean not null default false,
  add column if not exists module_weekly_reflection   boolean not null default false,
  add column if not exists module_journal             boolean not null default false;
