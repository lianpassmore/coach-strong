-- Coach notes: Eske's private per-participant observations.
-- Append-only timestamped entries (never overwrite, just add).

create table if not exists coach_notes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  note       text        not null,
  created_at timestamptz not null default now()
);

alter table coach_notes enable row level security;

-- Only admins can read/write coach notes
drop policy if exists "Admins manage coach notes" on coach_notes;
create policy "Admins manage coach notes"
  on coach_notes for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
