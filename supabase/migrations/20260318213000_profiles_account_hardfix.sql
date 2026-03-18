-- Hardening for profile/account linkage to avoid RLS failures on tenant-scoped inserts

-- Ensure users can create their own profile row when missing
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Harden account resolution used by RLS policies.
-- Prefer profile.account_id, fallback to account owned by the current user.
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.account_id
      FROM public.profiles p
      WHERE p.id = _user_id
        AND p.account_id IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT a.id
      FROM public.accounts a
      WHERE a.owner_id = _user_id
      LIMIT 1
    )
  )
$$;

-- Backfill missing profile.account_id from owned accounts.
UPDATE public.profiles p
SET account_id = a.id
FROM public.accounts a
WHERE p.id = a.owner_id
  AND p.account_id IS NULL;
