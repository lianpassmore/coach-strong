-- Add type column to knowledge_base for quick reference cards
alter table knowledge_base
  add column if not exists type text not null default 'knowledge'
    check (type in ('knowledge', 'reference_card'));

-- Existing rows stay as 'knowledge'
-- New reference_card rows will power the Quick Reference Cards page
