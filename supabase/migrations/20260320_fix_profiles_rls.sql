-- Fix infinite recursion in "Admins read all profiles" RLS policy.
-- The original policy queried profiles from within a profiles policy, causing a 500 loop.
-- Solution: use a security definer function to check is_admin, which bypasses RLS.

-- 1. Helper function that reads is_admin without triggering RLS
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from profiles where id = user_id),
    false
  );
$$;

-- 2. Drop the recursive policy and replace it
drop policy if exists "Admins read all profiles" on profiles;

create policy "Users and admins read profiles"
  on profiles for select
  using (
    auth.uid() = id
    or public.is_admin(auth.uid())
  );
