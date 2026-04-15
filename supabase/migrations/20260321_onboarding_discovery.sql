-- Allow current_week = 0 (program not yet started / waiting for kick-off)
alter table profiles
  drop constraint if exists profiles_current_week_check;
alter table profiles
  add constraint profiles_current_week_check check (current_week between 0 and 8);
alter table profiles
  alter column current_week set default 0;

-- Onboarding & discovery completion flags
alter table profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists discovery_completed  boolean not null default false;

-- Detailed onboarding responses (all the extra form fields beyond basic profile)
create table if not exists onboarding_responses (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users not null unique,

  -- Step 1 extras
  date_of_birth    date,
  phone            text,

  -- Step 3: Training
  training_experience     text,   -- beginner / intermediate / advanced
  training_days_per_week  integer,
  equipment_access        text[], -- gym, home-weights, resistance-bands, etc.

  -- Step 4: Nutrition
  dietary_restrictions    text[], -- vegetarian, vegan, gluten-free, dairy-free, etc.
  food_allergies          text,
  current_supplements     text,

  -- Step 5: Health screening
  medical_conditions      text,
  current_injuries        text,
  current_medications     text,

  -- Step 6: Lifestyle
  alcohol_frequency       text,   -- none / social / weekly / daily
  smoking_status          text,   -- non-smoker / ex-smoker / occasional / regular
  sleep_quality           integer check (sleep_quality between 1 and 5),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- RLS: participants can only see/write their own responses; admins can read all
alter table onboarding_responses enable row level security;

create policy "Users manage own onboarding responses"
  on onboarding_responses
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all onboarding responses"
  on onboarding_responses for select
  using (public.is_current_user_admin());
