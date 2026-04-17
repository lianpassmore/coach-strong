-- Function used by the login page to determine if a user has a password set.
-- If true, the password step is shown; otherwise the magic-link step is shown.
CREATE OR REPLACE FUNCTION public.check_user_has_password(user_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = user_email
      AND encrypted_password IS NOT NULL
      AND encrypted_password != ''
  );
$$;
