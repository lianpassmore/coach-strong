-- Move zoom link to cohort level — it's the same recurring Thursday session link
-- for the entire cohort. Replay links stay per-week in weekly_content.
alter table cohorts
  add column if not exists zoom_link text;
