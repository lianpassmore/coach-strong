-- Add session prep and replay timestamp columns to weekly_content
alter table weekly_content
  add column if not exists session_topic      text,
  add column if not exists session_prep_text  text,
  add column if not exists replay_timestamps  jsonb; -- [{label: string, seconds: number}]
