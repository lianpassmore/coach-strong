-- Stores one row per topic per conversation.
-- Populated by the ElevenLabs webhook at session end.
-- Queried by the admin dashboard to show topic frequency.

-- Table already created by Supabase with: id, conversation_id, user_id, topic, frequency, created_at
-- Add indexes and RLS only (no create — table exists).

create index if not exists conversation_topics_topic_idx on conversation_topics(topic);
create index if not exists conversation_topics_user_idx  on conversation_topics(user_id);

alter table conversation_topics enable row level security;

drop policy if exists "Admins read conversation_topics" on conversation_topics;
create policy "Admins read conversation_topics"
  on conversation_topics for select
  using (public.is_current_user_admin());
