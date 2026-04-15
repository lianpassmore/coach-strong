-- Add long_term_goal column to profiles for the North Star section
alter table profiles
  add column if not exists long_term_goal text;
