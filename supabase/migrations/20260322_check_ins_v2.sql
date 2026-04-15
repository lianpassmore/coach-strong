-- Add reflection and intention columns to check_ins
alter table check_ins
  add column if not exists went_well           text,
  add column if not exists min_goal_reflection text,
  add column if not exists morning_intention   text;
