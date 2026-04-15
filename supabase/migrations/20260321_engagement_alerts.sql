-- Engagement alerts: no-activity and low-energy pattern detection.
-- Crisis incidents remain in their own table.
-- This table covers the softer engagement signals.

create table if not exists engagement_alerts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  type       text        not null check (type in ('no_engagement', 'low_energy')),
  message    text        not null,
  severity   text        not null default 'medium' check (severity in ('medium', 'high')),
  read       boolean     not null default false,
  resolved   boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table engagement_alerts enable row level security;

-- Only admins can read/manage engagement alerts
drop policy if exists "Admins manage engagement alerts" on engagement_alerts;
create policy "Admins manage engagement alerts"
  on engagement_alerts for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- Index for fast unread lookups
create index if not exists engagement_alerts_unread_idx
  on engagement_alerts (resolved, created_at desc)
  where resolved = false;
