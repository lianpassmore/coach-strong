-- Seed development profiles so Lian and Eske see the full participant experience.
-- Safe to run multiple times (uses coalesce / where id is not null).

-- Lian Passmore — participant in April 9th cohort
update profiles
set
  full_name            = coalesce(nullif(full_name, ''), 'Lian Passmore'),
  preferred_name       = coalesce(nullif(preferred_name, ''), 'Lian'),
  onboarding_completed = true,
  discovery_completed  = true,
  cohort               = 'April 9th Kickoff',
  program_start_date   = '2026-04-09',
  current_week         = 1,
  program_phase        = 'active'
where id = (select id from auth.users where email = 'lianpassmore@gmail.com');

-- Eske — admin who also participates in the April 9th cohort
update profiles
set
  full_name            = coalesce(nullif(full_name, ''), 'Eske'),
  preferred_name       = coalesce(nullif(preferred_name, ''), 'Eske'),
  is_admin             = true,
  onboarding_completed = true,
  discovery_completed  = true,
  cohort               = 'April 9th Kickoff',
  program_start_date   = '2026-04-09',
  current_week         = 1,
  program_phase        = 'active'
where id = (select id from auth.users where email = 'eske@inspirechange.nz');
