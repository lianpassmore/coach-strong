-- Store the full ElevenLabs transcript on every conversation record
-- so Eske can review context from any session, not just crisis events.

alter table conversations
  add column if not exists transcript jsonb;   -- array of {role, message}
