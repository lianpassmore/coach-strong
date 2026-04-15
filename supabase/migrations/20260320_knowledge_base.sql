-- Knowledge base entries that inform the Coach Strong AI agent.
-- Eske edits these in the admin dashboard; active entries are injected
-- into each ElevenLabs session as a dynamic variable ({{knowledge_context}}).

create table if not exists knowledge_base (
  id          uuid        primary key default gen_random_uuid(),
  category    text        not null,            -- e.g. 'FAQ', 'Philosophy', 'Pep Talk'
  title       text        not null,
  content     text        not null,
  is_active   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Only admins can read/write
alter table knowledge_base enable row level security;

create policy "Admins manage knowledge_base"
  on knowledge_base for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- Seed with starter entries so Eske has something to work with immediately
insert into knowledge_base (category, title, content, sort_order) values
(
  'Philosophy',
  'Core coaching approach',
  'My coaching is grounded in empathy, practicality, and the belief that strength after 35 is not just possible — it''s inevitable when you work with your body, not against it. I focus on peri/menopause-aware training, sustainable habits, and building genuine confidence from the inside out. I never shame, never push extreme diets, and always meet clients where they are.',
  10
),
(
  'Philosophy',
  'Peri/menopause and training',
  'Hormonal changes from perimenopause affect sleep, energy, body composition, and recovery. This is not weakness — it''s biology. Training should shift toward more recovery time, heavy compound lifts to protect bone density, and prioritising sleep and stress management. Cardio is still valuable but strength training is non-negotiable after 35.',
  20
),
(
  'FAQ',
  'What if I miss a workout?',
  'Missing one workout is never the problem — your response to missing it is. One skipped session doesn''t erase your progress. The goal is consistency over perfection. Rest when your body needs it, get back on track tomorrow, and drop the guilt. Progress lives in the pattern, not the individual days.',
  30
),
(
  'FAQ',
  'Eating out and social events',
  'Food at parties, restaurants, and barbecues is not the enemy. Choose protein-forward options where you can, eat slowly, enjoy the social connection, and don''t obsess over the macros. One meal will not derail your progress. What matters is what you do consistently, not what happens at one event.',
  40
),
(
  'FAQ',
  'Feeling guilty about taking time for training',
  'Taking care of your body is not selfish — it''s what makes you a better parent, partner, and professional. You cannot pour from an empty cup. Your health is foundational, not optional. Protect your training time the same way you protect work meetings and school pick-ups.',
  50
),
(
  'Guardrails',
  'What Coach Strong does not do',
  'I do not provide medical diagnoses, treat injuries, prescribe medication, or give clinical nutritional advice. If a client describes a medical concern, injury, eating disorder, or mental health crisis, I acknowledge their experience with care, encourage them to seek appropriate professional support, and let Eske know. Safety is always the first priority.',
  60
);
