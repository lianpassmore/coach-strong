-- Add admin flag and notification preferences to profiles

alter table profiles
  add column if not exists is_admin            boolean     not null default false,
  add column if not exists notify_push         boolean     not null default true,
  add column if not exists notify_email        boolean     not null default false;

-- Security-definer helper to check admin status without triggering RLS recursion
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- Admins can read all profiles (for the coach dashboard)
-- Uses security-definer function to avoid infinite recursion in RLS
drop policy if exists "Admins read all profiles" on profiles;
create policy "Admins read all profiles"
  on profiles for select
  using (
    auth.uid() = id
    or public.is_current_user_admin()
  );
