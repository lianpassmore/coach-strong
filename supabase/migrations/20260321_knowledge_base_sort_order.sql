-- Add sort_order to knowledge_base (table already exists without this column).
alter table knowledge_base
  add column if not exists sort_order integer not null default 0;
