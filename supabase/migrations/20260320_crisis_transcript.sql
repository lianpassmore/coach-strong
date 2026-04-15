-- Store the full conversation transcript on crisis incidents so Eske
-- can read the full context, not just the matched trigger phrases.

alter table crisis_incidents
  add column if not exists full_transcript jsonb;   -- array of {role, message}
